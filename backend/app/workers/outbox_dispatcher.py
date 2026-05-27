"""Публикует outbox в Redis Stream (процесс legal-core)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import OutboxEvent
from app.domain.redis_client import get_redis

STREAM_KEY = "legalhub:case_events"
_log = logging.getLogger(__name__)
_task: asyncio.Task | None = None


async def _dispatch_loop() -> None:
    while True:
        try:
            r = await get_redis()
            if r is None:
                await asyncio.sleep(3)
                continue
            async with SessionLocal() as db:
                res = await db.execute(
                    select(OutboxEvent).where(OutboxEvent.published_at.is_(None)).order_by(OutboxEvent.created_at).limit(100)
                )
                rows = res.scalars().all()
                now = datetime.now(timezone.utc)
                for row in rows:
                    await r.xadd(
                        STREAM_KEY,
                        {"event_type": row.event_type, "payload": row.payload, "outbox_id": str(row.id)},
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
