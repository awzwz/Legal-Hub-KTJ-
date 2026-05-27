from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import user_branch_filter
from app.models import Claim, User
from app.domain.claims_excel_fill import build_claims_workbook_bytes


async def fetch_claims_for_export(
    db: AsyncSession, user: User, date_from: date, date_to: date
) -> list[Claim]:
    q = (
        select(Claim)
        .where(Claim.claim_date >= date_from)
        .where(Claim.claim_date <= date_to)
        .options(
            selectinload(Claim.branch),
            selectinload(Claim.assigned_lawyer),
            selectinload(Claim.case),
        )
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Claim.branch_id == bf)
    q = q.order_by(Claim.counterparty_name.asc(), Claim.claim_date.asc())
    res = await db.execute(q)
    return list(res.scalars().unique().all())


async def generate_claims_xlsx_bytes(
    db: AsyncSession, user: User, date_from: date, date_to: date
) -> bytes:
    claims = await fetch_claims_for_export(db, user, date_from, date_to)
    return build_claims_workbook_bytes(claims, date_from, date_to)
