from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, CaseFinance, InternalSyncDedupe, Payment


async def recalculate_paid_amount(db: AsyncSession, case_id: UUID) -> None:
    r = await db.execute(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.case_id == case_id))
    total: Decimal = r.scalar_one()
    fin = await db.get(CaseFinance, case_id)
    if fin:
        fin.paid_amount = total


async def sync_payment_from_1c(
    db: AsyncSession,
    *,
    document_number: str,
    payer_bin: str,
    payee_bin: str,
    amount: Decimal,
    payment_date: datetime,
    description: str,
    source: str = "1c",
) -> Tuple[bool, Optional[str], Optional[UUID]]:
    """
    Idempotent: same document_number + payer_bin + calendar day -> no duplicate row.
    Returns (ok, message, case_id).
    """
    dedupe_key = f"{document_number}|{payer_bin}|{payment_date.date().isoformat()}"
    existing = await db.execute(
        select(InternalSyncDedupe).where(
            InternalSyncDedupe.source == source,
            InternalSyncDedupe.dedupe_key == dedupe_key,
        )
    )
    if existing.scalar_one_or_none():
        return True, "duplicate_ignored", None

    r = await db.execute(
        select(Case).where(
            Case.company_bin == payer_bin,
            Case.status != "closed",
            Case.is_archived.is_(False),
        ).limit(1)
    )
    case = r.scalar_one_or_none()
    if not case:
        return False, "active_case_not_found_for_bin", None

    pay = Payment(
        case_id=case.id,
        document_number=document_number,
        payer=f"BIN {payer_bin}",
        payee=f"BIN {payee_bin}",
        payment_date=payment_date.date() if isinstance(payment_date, datetime) else payment_date,
        amount=amount,
        description=description,
    )
    db.add(pay)
    await db.flush()
    db.add(
        InternalSyncDedupe(
            source=source,
            dedupe_key=dedupe_key,
            payment_id=pay.id,
            created_at=datetime.now(timezone.utc),
        )
    )
    await recalculate_paid_amount(db, case.id)
    await db.commit()
    return True, None, case.id
