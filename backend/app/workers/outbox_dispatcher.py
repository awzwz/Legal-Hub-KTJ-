"""Публикует OutboxEvent-записи в Redis Streams.

Использует маппинг ``STREAM_KEYS`` из ``app.contracts.events`` — единственный
источник правды по тому, какой тип события в какой stream идёт. Если тип не
известен — публикуем в legacy ``legalhub:case_events`` (back-compat).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.contracts.events import STREAM_KEYS
from app.db.session import SessionLocal
from app.domain.redis_client import get_redis
from app.models import OutboxEvent

# Legacy: первая итерация event-bus писала всё в один stream.
LEGACY_STREAM_KEY = "legalhub:case_events"
STREAM_KEY = LEGACY_STREAM_KEY  # back-compat имя для существующих импортов

_log = logging.getLogger(__name__)
_task: asyncio.Task | None = None


def _resolve_stream(event_type: str) -> str:
    return STREAM_KEYS.get(event_type, LEGACY_STREAM_KEY)


async def _dispatch_loop() -> None:
    while True:
        try:
            r = await get_redis()
            if r is None:
                await asyncio.sleep(3)
                continue
            async with SessionLocal() as db:
                res = await db.execute(
                    select(OutboxEvent)
                    .where(OutboxEvent.published_at.is_(None))
                    .order_by(OutboxEvent.created_at)
                    .limit(100)
                )
                rows = res.scalars().all()
                now = datetime.now(timezone.utc)
                for row in rows:
                    stream = _resolve_stream(row.event_type)
                    await r.xadd(
                        stream,
                        {
                            # новый формат (event_bus.Consumer.parse_event ожидает 'data')
                            "type": row.event_type,
                            "data": row.payload,
                            "event_id": str(row.id),
                            # legacy-поля для совместимости со старым workspace_case_consumer
                            "event_type": row.event_type,
                            "payload": row.payload,
                            "outbox_id": str(row.id),
                        },
                    )
                    row.published_at = now
                if rows:
                    await db.commit()
        except Exception:
            _log.exception("outbox_dispatcher tick")
        await asyncio.sleep(1)


async def start_outbox_dispatcher() -> None:
    global _task
    if _task is not None and not _task.done():
        return
    _task = asyncio.create_task(_dispatch_loop(), name="outbox_dispatcher")


async def stop_outbox_dispatcher() -> None:
    global _task
    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
