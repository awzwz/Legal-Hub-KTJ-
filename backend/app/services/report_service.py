from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ReportRequest, User


async def create_report_request(
    db: AsyncSession,
    user: User,
    *,
    report_type: str,
    date_from: date,
    date_to: date,
) -> ReportRequest:
    row = ReportRequest(
        id=uuid4(),
        user_id=user.id,
        report_type=report_type[:64],
        date_from=date_from,
        date_to=date_to,
        status="pending",
        file_storage_key=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return row
