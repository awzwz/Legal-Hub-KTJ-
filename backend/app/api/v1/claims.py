from __future__ import annotations

from datetime import date
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, user_branch_filter
from app.core.permissions import require_can_mutate
from app.db.session import get_db
from app.models import Branch, Case, Claim, User
from app.schemas.claim import CaseShortOut, ClaimCreate, ClaimOut, ClaimUpdate
from app.domain import claims_excel_export

router = APIRouter(prefix="/claims", tags=["claims"])


async def _validate_assignment(
    db: AsyncSession,
    *,
    branch_id: Optional[UUID],
    assigned_lawyer_id: Optional[UUID],
) -> None:
    if branch_id is not None and await db.get(Branch, branch_id) is None:
        raise HTTPException(status_code=404, detail="Филиал не найден")
    if assigned_lawyer_id is None:
        return
    lawyer = await db.get(User, assigned_lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Назначенный юрист не найден")
    if branch_id is not None and lawyer.branch_id is not None and lawyer.branch_id != branch_id:
        raise HTTPException(status_code=400, detail="Назначенный юрист относится к другому филиалу")


def _to_out(c: Claim) -> dict:
    case_short = None
    if c.case is not None:
        case_short = CaseShortOut(
            id=str(c.case.id),
            case_number=c.case.case_number,
            status=c.case.status,
            party_role=c.case.party_role,
        )
    out = ClaimOut(
        id=str(c.id),
        counterparty_name=c.counterparty_name,
        counterparty_bin=c.counterparty_bin,
        outgoing_number=c.outgoing_number,
        claim_date=c.claim_date,
        subject=c.subject,
        amount=float(c.amount or 0),
        status=c.status,
        status_detail=c.status_detail,
        notes=c.notes,
        branch_id=c.branch_id,
        branch_name=c.branch.name if c.branch else None,
        assigned_lawyer_id=c.assigned_lawyer_id,
        assigned_lawyer_name=c.assigned_lawyer.full_name if c.assigned_lawyer else None,
        case_id=c.case_id,
        case=case_short,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )
    return out.model_dump(mode="json", by_alias=True)


@router.get("", summary="List claims (RBAC + filters)")
async def list_claims(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    date_from: Optional[date] = Query(default=None, alias="dateFrom"),
    date_to: Optional[date] = Query(default=None, alias="dateTo"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    counterparty_bin: Optional[str] = Query(default=None, alias="counterpartyBin"),
    branch_id: Optional[UUID] = Query(default=None, alias="branchId"),
    search: Optional[str] = Query(default=None),
):
    q = select(Claim).options(
        selectinload(Claim.branch),
        selectinload(Claim.assigned_lawyer),
        selectinload(Claim.case),
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Claim.branch_id == bf)
    if date_from:
        q = q.where(Claim.claim_date >= date_from)
    if date_to:
        q = q.where(Claim.claim_date <= date_to)
    if status_filter:
        q = q.where(Claim.status == status_filter)
    if counterparty_bin:
        q = q.where(Claim.counterparty_bin == counterparty_bin)
    if branch_id and bf is None:
        # Дополнительный фильтр доступен только для не-филиальных пользователей.
        q = q.where(Claim.branch_id == branch_id)
    if search:
        pattern = f"%{search.strip()}%"
        q = q.where(
            or_(
                Claim.outgoing_number.ilike(pattern),
                Claim.subject.ilike(pattern),
                Claim.counterparty_name.ilike(pattern),
            )
        )
    q = q.order_by(Claim.claim_date.desc(), Claim.counterparty_name.asc())
    rows = (await db.execute(q)).scalars().unique().all()
    return JSONResponse([_to_out(c) for c in rows])


@router.post("", status_code=201, summary="Create claim")
async def create_claim(
    body: ClaimCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    # Если case_id указан — проверим, что дело существует и доступно пользователю.
    case = None
    if body.case_id is not None:
        case = await db.get(Case, body.case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Связанное дело не найдено")
        bf = user_branch_filter(user)
        if bf is not None and case.branch_id != bf:
            raise HTTPException(status_code=403, detail="Нет доступа к этому делу")

    bf = user_branch_filter(user)
    if bf is not None and body.branch_id is not None and body.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нельзя создать претензию для другого филиала")
    target_branch_id = bf or body.branch_id or user.branch_id
    if case is not None:
        if target_branch_id is None:
            target_branch_id = case.branch_id
        elif target_branch_id != case.branch_id:
            raise HTTPException(status_code=400, detail="Связанное дело относится к другому филиалу")
    await _validate_assignment(
        db,
        branch_id=target_branch_id,
        assigned_lawyer_id=body.assigned_lawyer_id,
    )

    claim = Claim(
        counterparty_name=body.counterparty_name,
        counterparty_bin=body.counterparty_bin,
        outgoing_number=body.outgoing_number,
        claim_date=body.claim_date,
        subject=body.subject,
        amount=body.amount,
        status=body.status,
        status_detail=body.status_detail,
        notes=body.notes,
        branch_id=target_branch_id,
        assigned_lawyer_id=body.assigned_lawyer_id,
        case_id=body.case_id,
    )
    db.add(claim)
    await db.commit()
    await db.refresh(claim, attribute_names=["branch", "assigned_lawyer", "case"])
    return JSONResponse(_to_out(claim), status_code=201)


@router.get("/export.xlsx", summary="Download claims registry XLSX (по образцу юриста)")
async def export_claims_xlsx(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    date_from: date = Query(alias="dateFrom"),
    date_to: date = Query(alias="dateTo"),
):
    if date_from > date_to:
        raise HTTPException(status_code=400, detail="dateFrom must be <= dateTo")
    try:
        data = await claims_excel_export.generate_claims_xlsx_bytes(db, user, date_from, date_to)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    from urllib.parse import quote
    filename = f"Реестр претензий {date_from.isoformat()} — {date_to.isoformat()}.xlsx"
    # RFC 5987: для не-ASCII имён используем `filename*` + ASCII fallback.
    headers = {
        "Content-Disposition": f"attachment; filename=\"claims.xlsx\"; filename*=UTF-8''{quote(filename)}"
    }
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/{claim_id}", summary="Get single claim")
async def get_claim(
    claim_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    q = (
        select(Claim)
        .where(Claim.id == claim_id)
        .options(
            selectinload(Claim.branch),
            selectinload(Claim.assigned_lawyer),
            selectinload(Claim.case),
        )
    )
    row = (await db.execute(q)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Претензия не найдена")
    bf = user_branch_filter(user)
    if bf is not None and row.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return JSONResponse(_to_out(row))


@router.patch("/{claim_id}", summary="Update claim")
async def patch_claim(
    claim_id: UUID,
    body: ClaimUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    claim = await db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Претензия не найдена")
    bf = user_branch_filter(user)
    if bf is not None and claim.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа")

    data = body.model_dump(exclude_unset=True)
    target_branch_id = data.get("branch_id", claim.branch_id)
    if bf is not None and target_branch_id != bf:
        raise HTTPException(status_code=403, detail="Нельзя перенести претензию в другой филиал")

    # Проверим, что связанное дело существует, доступно и относится к тому же филиалу.
    target_case_id = data.get("case_id", claim.case_id)
    if target_case_id is not None:
        case = await db.get(Case, target_case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="Связанное дело не найдено")
        if bf is not None and case.branch_id != bf:
            raise HTTPException(status_code=403, detail="Нет доступа к этому делу")
        if target_branch_id is None:
            target_branch_id = case.branch_id
            data["branch_id"] = target_branch_id
        elif target_branch_id != case.branch_id:
            raise HTTPException(status_code=400, detail="Связанное дело относится к другому филиалу")

    await _validate_assignment(
        db,
        branch_id=target_branch_id,
        assigned_lawyer_id=data.get("assigned_lawyer_id", claim.assigned_lawyer_id),
    )

    for k, v in data.items():
        setattr(claim, k, v)
    await db.commit()
    await db.refresh(claim, attribute_names=["branch", "assigned_lawyer", "case"])
    return JSONResponse(_to_out(claim))


@router.delete("/{claim_id}", status_code=204, summary="Delete claim")
async def delete_claim(
    claim_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_can_mutate)],
):
    claim = await db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Претензия не найдена")
    bf = user_branch_filter(user)
    if bf is not None and claim.branch_id != bf:
        raise HTTPException(status_code=403, detail="Нет доступа")
    await db.delete(claim)
    await db.commit()
    return Response(status_code=204)
