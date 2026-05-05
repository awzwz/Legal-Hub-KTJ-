"""Постановка событий в transactional outbox."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OutboxEvent


async def enqueue_outbox(db: AsyncSession, event_type: str, payload: dict[str, Any]) -> None:
    db.add(
        OutboxEvent(
            id=uuid4(),
            event_type=event_type,
            payload=json.dumps(payload, default=str),
            created_at=datetime.now(timezone.utc),
        )
    )
