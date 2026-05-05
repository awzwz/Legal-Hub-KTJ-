from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User


async def write_audit_log(
    session: AsyncSession,
    user: User | None,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None,
    details: str,
    ip: str | None = None,
    endpoint: str | None = None,
) -> None:
    session.add(
        AuditLog(
            id=uuid4(),
            user_id=user.id if user else None,
            action=action,
            entity_type=entity_type,
            entity_id=(entity_id[:64] if entity_id else None),
            details=details,
            ip=ip,
            endpoint=endpoint,
            created_at=datetime.now(timezone.utc),
        )
    )
