"""Workspace-консумер: материализует уведомления из событий.

Подписывается на streams ``legalhub:case_events`` и ``legalhub:notification_requests``.
На каждое событие:
  - NotificationRequested       — материализует Notification, применяя preferences
                                  и dedup, как раньше делал inline create_inline_notification;
  - CaseAssigned                — пока no-op (отдельное уведомление шлётся через
                                  параллельный NotificationRequested); зарезервирован
                                  для будущих rollup-метрик / push-каналов;
  - CaseCreated / CaseUpdated   — no-op в новой схеме (всё нужное теперь идёт
                                  через NotificationRequested от case_service).
"""

from __future__ import annotations

import logging

from app.contracts.events import (
    CaseAssigned,
    CaseCreated,
    CaseUpdated,
    NotificationRequested,
)
from app.db.session import SessionLocal
from app.domain.notifications.triggers import create_inline_notification
from app.infra.event_bus import Consumer

_log = logging.getLogger(__name__)
_consumer: Consumer | None = None


# ───────────────────────────── handlers ─────────────────────────────
async def _on_notification_requested(event: NotificationRequested) -> None:
    async with SessionLocal() as db:
        try:
            await create_inline_notification(
                db,
                event.user_id,
                title=event.title,
                body=event.body,
                type=event.notification_type,
                priority=event.priority,
                case_id=event.case_id,
                dedup_key=event.dedup_key,
            )
            await db.commit()
        except Exception:
            await db.rollback()
            raise


async def _on_case_assigned(event: CaseAssigned) -> None:
    _log.debug("CaseAssigned %s lawyer=%s", event.case_id, event.assigned_lawyer_id)


async def _on_case_created(_: CaseCreated) -> None:
    return None


async def _on_case_updated(_: CaseUpdated) -> None:
    return None


# ───────────────────────────── lifecycle ─────────────────────────────
def _build_consumer() -> Consumer:
    c = Consumer(
        group="workspace",
        consumer="w1",
        streams=["legalhub:case_events", "legalhub:notification_requests"],
    )
    c.on("NotificationRequested", _on_notification_requested)
    c.on("CaseAssigned", _on_case_assigned)
    c.on("CaseCreated", _on_case_created)
    c.on("CaseUpdated", _on_case_updated)
    return c


async def start_workspace_case_consumer() -> None:
    global _consumer
    if _consumer is None:
        _consumer = _build_consumer()
    await _consumer.start()


async def stop_workspace_case_consumer() -> None:
    global _consumer
    if _consumer is not None:
        await _consumer.stop()
        _consumer = None
