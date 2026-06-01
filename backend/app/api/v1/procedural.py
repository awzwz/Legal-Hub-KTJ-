from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, user_branch_filter
from app.core.permissions import require_can_mutate
from app.db.session import get_db
from app.models import Case, ProceduralDeadline, User
from app.schemas.procedural import ProceduralDeadlineCreate, ProceduralDeadlineUpdate

router = APIRouter(tags=["procedural"])


def _to_out(d: ProceduralDeadline, case_number: Optional[str]) -> dict:
    today = date.today()
    is_overdue = (d.completed_at is None) and (d.due_date < today)
    return {
        "id": str(d.id),
        "caseId": str(d.case_id),
        "caseNumber": case_number,
        "kind": d.kind,
        "dueDate": d.due_date.isoformat(),
        "completedAt": d.completed_at.isoformat() if d.completed_at else None,
        "notes": d.notes,
        "createdAt": d.created_at.isoformat(),
        "updatedAt": d.updated_at.isoformat(),
        "isOverdue": is_overdue,
    }


@router.get("/procedural-deadlines", summary="Список процедурных дедлайнов")
async def list_deadlines(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    case_id: Optional[UUID] = Query(default=None, alias="caseId"),
    overdue_only: bool = Query(default=False, alias="overdueOnly"),
    due_within_days: Optional[int] = Query(default=None, alias="dueWithinDays"),
):
    q = (
        select(ProceduralDeadline, Case)
        .join(Case, ProceduralDeadline.case_id == Case.id)
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    if case_id is not None:
        q = q.where(ProceduralDeadline.case_id == case_id)
    if overdue_only:
        today = date.today()
        q = q.where(and_(ProceduralDeadline.completed_at.is_(None), ProceduralDeadline.due_date < today))
    if due_within_days is not None:
        from datetime import timedelta
        today = date.today()
        q = q.where(and_(
            ProceduralDeadline.completed_at.is_(None),
            ProceduralDeadline.due_date >= today,
            ProceduralDeadline.due_date <= today + timedelta(days=due_within_days),
        ))
    q = q.order_by(ProceduralDeadline.due_date.asc())

    rows = (await db.execute(q)).all()
    return JSONResponse([_to_out(d, c.case_number) for d, c in rows])


@router.post("/cases/{case_id}/deadlines", status_code=201, summary="Создать процедурный дедлайн")
async def create_deadline(
    case_id: UUID,
    body: ProceduralDeadlineCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    bf = user_branch_filter(user)
    if bf is not None and case.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа к этому делу")

    d = ProceduralDeadline(
        case_id=case_id,
        kind=body.kind,
        due_date=body.due_date,
        completed_at=body.completed_at,
        notes=body.notes,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return JSONResponse(_to_out(d, case.case_number), status_code=201)


@router.patch("/deadlines/{deadline_id}", summary="Обновить дедлайн")
async def patch_deadline(
    deadline_id: UUID,
    body: ProceduralDeadlineUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    d = await db.get(ProceduralDeadline, deadline_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Дедлайн не найден")
    case = await db.get(Case, d.case_id)
    bf = user_branch_filter(user)
    if bf is not None and case is not None and case.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(d, k, v)
    await db.commit()
    await db.refresh(d)
    return JSONResponse(_to_out(d, case.case_number if case else None))


@router.delete("/deadlines/{deadline_id}", status_code=204, summary="Удалить дедлайн")
async def delete_deadline(
    deadline_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    d = await db.get(ProceduralDeadline, deadline_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Дедлайн не найден")
    case = await db.get(Case, d.case_id)
    bf = user_branch_filter(user)
    if bf is not None and case is not None and case.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа")
    await db.delete(d)
    await db.commit()
    return Response(status_code=204)
