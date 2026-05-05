from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, Case, User


async def list_audit_entries(
    db: AsyncSession,
    user: User,
    *,
    limit: int = 300,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
) -> list[dict]:
    if user.role not in ("director", "chief_lawyer"):
        raise HTTPException(status_code=403, detail="Audit log is restricted")

    lim = min(max(limit, 1), 500)
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(lim)
    if user_id and user_id != "all":
        try:
            q = q.where(AuditLog.user_id == UUID(user_id))
        except ValueError:
            pass
    if action and action != "all":
        q = q.where(AuditLog.action == action)

    res = await db.execute(q)
    logs = list(res.scalars().all())

    user_ids = {log.user_id for log in logs if log.user_id}
    users_by_id: dict[UUID, User] = {}
    if user_ids:
        ur = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in ur.scalars():
            users_by_id[u.id] = u

    case_uuids: list[UUID] = []
    for log in logs:
        if log.entity_type == "case" and log.entity_id:
            try:
                case_uuids.append(UUID(log.entity_id))
            except ValueError:
                pass
    cases_by_id: dict[UUID, str] = {}
    if case_uuids:
        cr = await db.execute(select(Case).where(Case.id.in_(case_uuids)))
        for c in cr.scalars():
            cases_by_id[c.id] = c.case_number

    out: list[dict] = []
    for log in logs:
        u = users_by_id.get(log.user_id) if log.user_id else None

        case_no: Optional[str] = None
        if log.entity_type == "case" and log.entity_id:
            try:
                case_no = cases_by_id.get(UUID(log.entity_id))
            except ValueError:
                case_no = None
        if case_no is None and log.details and "[" in log.details and "]" in log.details:
            tail = log.details.rsplit("[", 1)[-1]
            case_no = tail.split("]", 1)[0] if "]" in tail else None

        out.append(
            {
                "id": str(log.id),
                "timestamp": log.created_at.isoformat(),
                "userId": str(log.user_id) if log.user_id else "",
                "userName": u.full_name if u else "Система",
                "userRole": (u.role if u else "system"),
                "action": log.action,
                "entityType": log.entity_type,
                "entityId": log.entity_id or "",
                "details": (log.details or "").split("[", 1)[0].strip(),
                "caseNumber": case_no or (log.details or "-"),
            }
        )
    return out
