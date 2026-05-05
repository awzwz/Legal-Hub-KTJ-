from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import can_mutate
from app.models import CaseLitigation, DebtRecoveryEntry, EnforcementProceeding, User
from app.schemas.case_extensions import (
    CaseLitigationOut,
    CaseLitigationUpsertBody,
    CreateDebtRecoveryBody,
    CreateEnforcementBody,
    DebtRecoveryEntryOut,
    EnforcementProceedingOut,
    PatchDebtRecoveryBody,
    PatchEnforcementBody,
)
from app.services.audit_write import write_audit_log
from app.services.case_service import _fetch_case_row


def _d(d: date) -> str:
    return d.isoformat()


def _lit_out(row: CaseLitigation) -> CaseLitigationOut:
    return CaseLitigationOut(
        claim_summary=row.claim_summary or "",
        judgment_first=row.judgment_first or "",
        judgment_appeal=row.judgment_appeal or "",
        judgment_cassation=row.judgment_cassation or "",
        damage_recovery_note=row.damage_recovery_note or "",
        writ_request_note=row.writ_request_note or "",
        writ_dispatch_note=row.writ_dispatch_note or "",
        execution_proof_note=row.execution_proof_note or "",
        defendant_execution_note=row.defendant_execution_note or "",
        third_party_note=row.third_party_note or "",
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
    )


def _enf_out(row: EnforcementProceeding) -> EnforcementProceedingOut:
    return EnforcementProceedingOut(
        id=str(row.id),
        debtor_name=row.debtor_name or "",
        debtor_bin=row.debtor_bin,
        court_act_summary=row.court_act_summary or "",
        amount_total=float(row.amount_total),
        amount_main=float(row.amount_main),
        amount_fines=float(row.amount_fines),
        amount_fees=float(row.amount_fees),
        progress_notes=row.progress_notes or "",
        collected_amount=float(row.collected_amount),
        collection_doc_ref=row.collection_doc_ref or "",
        balance_remaining=float(row.balance_remaining),
        status_label=row.status_label or "",
        recorded_at=_d(row.recorded_at),
    )


def _debt_out(row: DebtRecoveryEntry) -> DebtRecoveryEntryOut:
    return DebtRecoveryEntryOut(
        id=str(row.id),
        case_id=str(row.case_id) if row.case_id else None,
        counterparty_bin=row.counterparty_bin,
        debtor_name=row.debtor_name or "",
        debtor_status=row.debtor_status or "",
        debt_amount=float(row.debt_amount),
        paid_amount=float(row.paid_amount),
        written_off_amount=float(row.written_off_amount),
        work_summary=row.work_summary or "",
        recorded_at=_d(row.recorded_at),
    )


async def get_litigation(db: AsyncSession, user: User, case_id: UUID) -> CaseLitigationOut:
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    row = case.litigation
    if not row:
        return CaseLitigationOut()
    return _lit_out(row)


async def upsert_litigation(
    db: AsyncSession, user: User, case_id: UUID, body: CaseLitigationUpsertBody
) -> CaseLitigationOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    now = datetime.now(timezone.utc)
    if case.litigation:
        lit = case.litigation
        lit.claim_summary = body.claim_summary
        lit.judgment_first = body.judgment_first
        lit.judgment_appeal = body.judgment_appeal
        lit.judgment_cassation = body.judgment_cassation
        lit.damage_recovery_note = body.damage_recovery_note
        lit.writ_request_note = body.writ_request_note
        lit.writ_dispatch_note = body.writ_dispatch_note
        lit.execution_proof_note = body.execution_proof_note
        lit.defendant_execution_note = body.defendant_execution_note
        lit.third_party_note = body.third_party_note
        lit.updated_at = now
    else:
        lit = CaseLitigation(
            case_id=case.id,
            claim_summary=body.claim_summary,
            judgment_first=body.judgment_first,
            judgment_appeal=body.judgment_appeal,
            judgment_cassation=body.judgment_cassation,
            damage_recovery_note=body.damage_recovery_note,
            writ_request_note=body.writ_request_note,
            writ_dispatch_note=body.writ_dispatch_note,
            execution_proof_note=body.execution_proof_note,
            defendant_execution_note=body.defendant_execution_note,
            third_party_note=body.third_party_note,
            created_at=now,
            updated_at=now,
        )
        db.add(lit)

    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="case_litigation",
        entity_id=str(case_id),
        details="Обновлены судебные материалы по делу",
    )
    await db.commit()
    r2 = await db.execute(select(CaseLitigation).where(CaseLitigation.case_id == case_id))
    saved = r2.scalar_one_or_none()
    return _lit_out(saved) if saved else CaseLitigationOut()


async def list_enforcement(db: AsyncSession, user: User, case_id: UUID) -> list[EnforcementProceedingOut]:
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    rows = sorted(case.enforcement_proceedings, key=lambda x: x.recorded_at)
    return [_enf_out(r) for r in rows]


async def create_enforcement(
    db: AsyncSession, user: User, case_id: UUID, body: CreateEnforcementBody
) -> EnforcementProceedingOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    rd = date.today()
    if body.recorded_at:
        rd = date.fromisoformat(body.recorded_at[:10])

    row = EnforcementProceeding(
        id=uuid4(),
        case_id=case.id,
        debtor_name=body.debtor_name,
        debtor_bin=(body.debtor_bin or None),
        court_act_summary=body.court_act_summary,
        amount_total=Decimal(str(body.amount_total)),
        amount_main=Decimal(str(body.amount_main)),
        amount_fines=Decimal(str(body.amount_fines)),
        amount_fees=Decimal(str(body.amount_fees)),
        progress_notes=body.progress_notes,
        collected_amount=Decimal(str(body.collected_amount)),
        collection_doc_ref=body.collection_doc_ref,
        balance_remaining=Decimal(str(body.balance_remaining)),
        status_label=body.status_label,
        recorded_at=rd,
    )
    db.add(row)
    await write_audit_log(
        db,
        user,
        action="create",
        entity_type="enforcement_proceeding",
        entity_id=str(row.id),
        details=f"Строка ИП по делу {case.case_number}",
    )
    await db.commit()
    await db.refresh(row)
    return _enf_out(row)


async def patch_enforcement(
    db: AsyncSession, user: User, case_id: UUID, enforcement_id: UUID, body: PatchEnforcementBody
) -> EnforcementProceedingOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    r = await db.execute(
        select(EnforcementProceeding).where(
            EnforcementProceeding.id == enforcement_id, EnforcementProceeding.case_id == case_id
        )
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Enforcement row not found")

    if body.debtor_name is not None:
        row.debtor_name = body.debtor_name
    if body.debtor_bin is not None:
        row.debtor_bin = body.debtor_bin or None
    if body.court_act_summary is not None:
        row.court_act_summary = body.court_act_summary
    if body.amount_total is not None:
        row.amount_total = Decimal(str(body.amount_total))
    if body.amount_main is not None:
        row.amount_main = Decimal(str(body.amount_main))
    if body.amount_fines is not None:
        row.amount_fines = Decimal(str(body.amount_fines))
    if body.amount_fees is not None:
        row.amount_fees = Decimal(str(body.amount_fees))
    if body.progress_notes is not None:
        row.progress_notes = body.progress_notes
    if body.collected_amount is not None:
        row.collected_amount = Decimal(str(body.collected_amount))
    if body.collection_doc_ref is not None:
        row.collection_doc_ref = body.collection_doc_ref
    if body.balance_remaining is not None:
        row.balance_remaining = Decimal(str(body.balance_remaining))
    if body.status_label is not None:
        row.status_label = body.status_label
    if body.recorded_at is not None:
        row.recorded_at = date.fromisoformat(body.recorded_at[:10])

    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="enforcement_proceeding",
        entity_id=str(enforcement_id),
        details="Обновлена строка ИП",
    )
    await db.commit()
    await db.refresh(row)
    return _enf_out(row)


async def delete_enforcement(db: AsyncSession, user: User, case_id: UUID, enforcement_id: UUID) -> None:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    r = await db.execute(
        delete(EnforcementProceeding).where(
            EnforcementProceeding.id == enforcement_id, EnforcementProceeding.case_id == case_id
        )
    )
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="Enforcement row not found")
    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="enforcement_proceeding",
        entity_id=str(enforcement_id),
        details="Удалена строка ИП",
    )
    await db.commit()


async def list_debt_recovery(db: AsyncSession, user: User, case_id: UUID) -> list[DebtRecoveryEntryOut]:
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    rows = [e for e in case.debt_recovery_entries if e.case_id == case.id]
    rows.sort(key=lambda x: x.recorded_at)
    return [_debt_out(r) for r in rows]


async def create_debt_recovery(
    db: AsyncSession, user: User, case_id: UUID, body: CreateDebtRecoveryBody
) -> DebtRecoveryEntryOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    rd = date.today()
    if body.recorded_at:
        rd = date.fromisoformat(body.recorded_at[:10])

    row = DebtRecoveryEntry(
        id=uuid4(),
        case_id=case.id,
        counterparty_bin=(body.counterparty_bin or None),
        debtor_name=body.debtor_name,
        debtor_status=body.debtor_status,
        debt_amount=Decimal(str(body.debt_amount)),
        paid_amount=Decimal(str(body.paid_amount)),
        written_off_amount=Decimal(str(body.written_off_amount)),
        work_summary=body.work_summary,
        recorded_at=rd,
    )
    db.add(row)
    await write_audit_log(
        db,
        user,
        action="create",
        entity_type="debt_recovery_entry",
        entity_id=str(row.id),
        details=f"Запись по дебиторке по делу {case.case_number}",
    )
    await db.commit()
    await db.refresh(row)
    return _debt_out(row)


async def patch_debt_recovery(
    db: AsyncSession, user: User, case_id: UUID, entry_id: UUID, body: PatchDebtRecoveryBody
) -> DebtRecoveryEntryOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    r = await db.execute(
        select(DebtRecoveryEntry).where(DebtRecoveryEntry.id == entry_id, DebtRecoveryEntry.case_id == case_id)
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Debt recovery row not found")

    if body.counterparty_bin is not None:
        row.counterparty_bin = body.counterparty_bin or None
    if body.debtor_name is not None:
        row.debtor_name = body.debtor_name
    if body.debtor_status is not None:
        row.debtor_status = body.debtor_status
    if body.debt_amount is not None:
        row.debt_amount = Decimal(str(body.debt_amount))
    if body.paid_amount is not None:
        row.paid_amount = Decimal(str(body.paid_amount))
    if body.written_off_amount is not None:
        row.written_off_amount = Decimal(str(body.written_off_amount))
    if body.work_summary is not None:
        row.work_summary = body.work_summary
    if body.recorded_at is not None:
        row.recorded_at = date.fromisoformat(body.recorded_at[:10])

    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="debt_recovery_entry",
        entity_id=str(entry_id),
        details="Обновлена запись по дебиторке",
    )
    await db.commit()
    await db.refresh(row)
    return _debt_out(row)


async def delete_debt_recovery(db: AsyncSession, user: User, case_id: UUID, entry_id: UUID) -> None:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    r = await db.execute(
        delete(DebtRecoveryEntry).where(DebtRecoveryEntry.id == entry_id, DebtRecoveryEntry.case_id == case_id)
    )
    if r.rowcount == 0:
        raise HTTPException(status_code=404, detail="Debt recovery row not found")
    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="debt_recovery_entry",
        entity_id=str(entry_id),
        details="Удалена запись по дебиторке",
    )
    await db.commit()
