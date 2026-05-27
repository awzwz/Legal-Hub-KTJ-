"""Читает Redis Stream с событиями дел и создаёт уведомления (workspace)."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from app.db.session import SessionLocal
from app.models import Notification
from app.domain.redis_client import get_redis
from app.workers.outbox_dispatcher import STREAM_KEY

_log = logging.getLogger(__name__)
_task: asyncio.Task | None = None
GROUP = "workspace"
CONSUMER = "w1"


async def _consume_loop() -> None:
    while True:
        try:
            r = await get_redis()
            if r is None:
                await asyncio.sleep(3)
                continue
            try:
                await r.xgroup_create(STREAM_KEY, GROUP, id="0", mkstream=True)
            except Exception:
                pass
            resp = await r.xreadgroup(GROUP, CONSUMER, streams={STREAM_KEY: ">"}, count=20, block=5000)
            if not resp:
                continue
            for _stream_name, messages in resp:
                for msg_id, data in messages:
                    await _handle_message(data)
                    await r.xack(STREAM_KEY, GROUP, msg_id)
        except asyncio.CancelledError:
            raise
        except Exception:
            _log.exception("workspace_case_consumer tick")
            await asyncio.sleep(1)


async def _handle_message(data: dict) -> None:
    et = data.get("event_type")
    raw = data.get("payload")
    if not raw or et not in ("CaseUpdated", "CaseCreated"):
        return
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return
    case_id = payload.get("caseId")
    status = payload.get("status")
    prev = payload.get("previousStatus")
    lawyer_id = payload.get("assignedLawyerId")
    if not case_id or not lawyer_id:
        return
    if et == "CaseUpdated" and prev == status:
        return
    title = "Обновление дела" if et == "CaseUpdated" else "Новое дело"
    body = f"Статус: {status}" if status else "Дело в реестре"
    async with SessionLocal() as db:
        db.add(
            Notification(
                user_id=UUID(lawyer_id),
                title=title,
                body=body,
                type="info",
                priority="medium",
                read_at=None,
                case_id=UUID(case_id),
                created_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()


async def start_workspace_case_consumer() -> None:
    global _task
    if _task is not None and not _task.done():
        return
    _task = asyncio.create_task(_consume_loop(), name="workspace_case_consumer")


async def stop_workspace_case_consumer() -> None:
    global _task
    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
