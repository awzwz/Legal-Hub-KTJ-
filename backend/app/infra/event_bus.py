"""Event bus поверх Redis Streams.

Назначение:
- ``publish(event)`` — записывает типизированное доменное событие в нужный stream.
- ``Consumer`` — long-running coroutine, читает stream через consumer-group,
  валидирует payload против ``DomainEvent`` discriminated union и вызывает
  зарегистрированные обработчики.

Соглашения:
- Один stream может содержать несколько типов событий (см. ``STREAM_KEYS``).
- Каждый сервис — отдельная consumer-group; внутри группы — несколько consumer-
  инстансов для горизонтального масштабирования. Acknowledgement only on success.
- Сбой обработчика → сообщение остаётся в pending list (см. XPENDING). Восстановление
  выполняет cron / отдельный процесс reclaim (вне MVP).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable, Iterable, Optional
from uuid import UUID

from pydantic import TypeAdapter, ValidationError

from app.contracts.events import STREAM_KEYS, DomainEvent
from app.domain.redis_client import get_redis

_log = logging.getLogger(__name__)
_event_adapter: TypeAdapter[DomainEvent] = TypeAdapter(DomainEvent)


# ───────────────────────────── publish ─────────────────────────────
async def publish(event: DomainEvent) -> Optional[str]:
    """Опубликовать событие. Возвращает Redis stream id или None если Redis недоступен."""
    redis = await get_redis()
    if redis is None:
        _log.warning("event_bus: Redis недоступен, событие %s потеряно", event.type)
        return None
    stream = STREAM_KEYS[event.type]
    payload = event.model_dump_json()
    # event_id ставим в fields, чтобы Idempotency-обработчики могли проверять
    # дубликаты по нему вне stream id (stream id меняется при republish).
    return await redis.xadd(stream, {"type": event.type, "data": payload, "event_id": str(event.event_id)})


def parse_event(raw: bytes | str) -> Optional[DomainEvent]:
    """Парсит сырой JSON в типизированное событие. None — если невалидно."""
    try:
        return _event_adapter.validate_json(raw)
    except ValidationError as e:
        _log.error("event_bus: invalid event payload: %s", e)
        return None


# ───────────────────────────── consume ─────────────────────────────
Handler = Callable[[DomainEvent], Awaitable[None]]


class Consumer:
    """Подписчик одного или нескольких streams в рамках consumer-group.

    Пример:
        consumer = Consumer(group="workspace", consumer="w1",
                            streams=["legalhub:case_events"])
        consumer.on("CaseAssigned", handle_case_assigned)
        await consumer.start()
        ...
        await consumer.stop()
    """

    def __init__(self, *, group: str, consumer: str, streams: Iterable[str]) -> None:
        self._group = group
        self._consumer = consumer
        self._streams = list(dict.fromkeys(streams))  # dedup, preserve order
        self._handlers: dict[str, list[Handler]] = {}
        self._task: Optional[asyncio.Task] = None

    def on(self, event_type: str, handler: Handler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._task = asyncio.create_task(self._loop(), name=f"event_bus:{self._group}:{self._consumer}")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def _ensure_groups(self, redis: Any) -> None:
        for stream in self._streams:
            try:
                await redis.xgroup_create(stream, self._group, id="0", mkstream=True)
            except Exception:
                # BUSYGROUP — нормально, группа уже есть.
                pass

    async def _loop(self) -> None:
        while True:
            try:
                redis = await get_redis()
                if redis is None:
                    await asyncio.sleep(3)
                    continue
                await self._ensure_groups(redis)

                resp = await redis.xreadgroup(
                    self._group,
                    self._consumer,
                    streams={s: ">" for s in self._streams},
                    count=20,
                    block=5000,
                )
                if not resp:
                    continue

                for stream_name, messages in resp:
                    for msg_id, fields in messages:
                        await self._handle_one(redis, stream_name, msg_id, fields)
            except asyncio.CancelledError:
                raise
            except Exception:
                _log.exception("event_bus consumer %s tick", self._group)
                await asyncio.sleep(1)

    async def _handle_one(self, redis: Any, stream: str, msg_id: str, fields: dict) -> None:
        data = fields.get(b"data") if isinstance(next(iter(fields), ""), bytes) else fields.get("data")
        if data is None:
            await redis.xack(stream, self._group, msg_id)
            return

        event = parse_event(data)
        if event is None:
            # Невалидный payload — ack чтобы не зацикливаться. Логируется в parse_event.
            await redis.xack(stream, self._group, msg_id)
            return

        handlers = self._handlers.get(event.type, [])
        if not handlers:
            # Сервис не подписан на этот тип — ack и идём дальше.
            await redis.xack(stream, self._group, msg_id)
            return

        try:
            for h in handlers:
                await h(event)
        except Exception:
            _log.exception("event_bus: handler %s failed for %s", event.type, event.event_id)
            # Не делаем xack → сообщение в pending list, будет реклеймнуто.
            return

        await redis.xack(stream, self._group, msg_id)


def make_uuid(value: Optional[str | UUID]) -> Optional[UUID]:
    """Утилита: безопасное преобразование строки в UUID для обработчиков."""
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(value)
    except (ValueError, TypeError):
        return None
