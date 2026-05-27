"""Transactional outbox: запись доменных событий в одной транзакции с бизнес-данными.

Два API:
- ``enqueue_outbox_event(db, event)`` — для типизированных событий из
  ``app.contracts.events``.
- ``enqueue_outbox(db, type, payload)`` — legacy, для постепенной миграции.

Воркер ``app.workers.outbox_dispatcher`` периодически выгребает неопубликованные
записи и пушит их в Redis Streams через ``app.infra.event_bus``.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.events import DomainEvent
from app.models import OutboxEvent


async def enqueue_outbox(db: AsyncSession, event_type: str, payload: dict[str, Any]) -> None:
    """Legacy: добавить событие как сырой dict. Сохраняется для постепенной миграции."""
    db.add(
        OutboxEvent(
            id=uuid4(),
            event_type=event_type,
            payload=json.dumps(payload, default=str),
            created_at=datetime.now(timezone.utc),
        )
    )


async def enqueue_outbox_event(db: AsyncSession, event: DomainEvent) -> None:
    """Type-safe API: положить типизированное событие в outbox."""
    db.add(
        OutboxEvent(
            id=uuid4(),
            event_type=event.type,
            payload=event.model_dump_json(),
            created_at=datetime.now(timezone.utc),
        )
    )
