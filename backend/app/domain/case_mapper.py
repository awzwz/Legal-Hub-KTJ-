from __future__ import annotations

from datetime import date, datetime
from typing import Optional, Union

from app.models import Case
from app.schemas.case_extensions import CaseLitigationOut, DebtRecoveryEntryOut, EnforcementProceedingOut
from app.schemas.legal_case import (
    CaseCommentOut,
    CaseDocumentOut,
    CaseEventOut,
    LegalCaseOut,
    PaymentOut,
)


def _d(v: Union[date, datetime]) -> str:
    if isinstance(v, datetime):
        return v.date().isoformat()
    return v.isoformat()


def _dt(v: Optional[datetime]) -> Optional[str]:
    if v is None:
        return None
    return v.date().isoformat()


def compute_significance(row: Case) -> str:
    """Динамическая значимость дела (low / medium / high).

    База — сумма иска. Поверх — модификаторы:
      • КТЖ выиграл и дело закрыто → понижаем на 1 уровень (значимость уходит вниз).
      • Просрочка (days_overdue > 0) → повышаем на 1 уровень (срочность важнее размера).
      • Дело открытое (любой не-closed/withdrawn статус) И мы ответчик → удерживаем минимум medium
        даже для маленьких сумм — потому что любой проигрыш = реальные деньги наружу.
    """
    fin = row.finances
    amount = float(fin.claim_amount) if fin and fin.claim_amount is not None else 0.0

    if amount >= 50_000_000:
        level = "high"
    elif amount >= 5_000_000:
        level = "medium"
    else:
        level = "low"

    levels = ["low", "medium", "high"]
    idx = levels.index(level)

    status = (row.status or "").lower()
    outcome = (row.outcome or "").lower()
    party_role = (row.party_role or "").lower()
    is_closed = status in ("closed", "withdrawn")

    if is_closed:
        ktz_won_as_plaintiff = party_role == "plaintiff" and outcome in (
            "fully_satisfied", "partially_satisfied", "settled",
        )
        ktz_won_as_defendant = party_role == "defendant" and outcome in ("denied", "dismissed")
        if ktz_won_as_plaintiff or ktz_won_as_defendant:
            idx = max(0, idx - 1)

    if not is_closed and party_role == "defendant" and idx == 0:
        idx = 1

    if (row.days_overdue or 0) > 0 and not is_closed:
        idx = min(2, idx + 1)

    return levels[idx]


def effective_significance(row: Case) -> str:
    """User-facing significance.

    Юристы управляют значимостью вручную. Авторасчет оставляем только как
    fallback для старых/битых строк, где значение не заполнено корректно.
    """
    manual = (row.risk_level or "").strip().lower()
    if manual in {"low", "medium", "high"}:
        return manual
    return compute_significance(row)


def case_to_legal_case_out(row: Case) -> LegalCaseOut:
    fin = row.finances
    lawyer = row.assigned_lawyer.full_name if row.assigned_lawyer else ""
    branch_name = row.branch.name

    payments = [
        PaymentOut(
            id=str(p.id),
            document_number=p.document_number,
            payer=p.payer,
            payee=p.payee,
            date=_d(p.payment_date),
            amount=float(p.amount),
        )
        for p in sorted(row.payments, key=lambda x: x.payment_date)
    ]
    documents = [
        CaseDocumentOut(
            id=str(d.id),
            title=d.title,
            upload_date=_d(d.created_at),
            author=d.author_name,
        )
        for d in sorted(row.documents, key=lambda x: x.created_at)
    ]
    comments = [
        CaseCommentOut(
            id=str(c.id),
            author=c.author_name,
            role=c.role_label,
            text=c.text,
            type=c.comment_type,
            date=_d(c.comment_date),
            likes=c.likes,
        )
        for c in sorted(row.comments, key=lambda x: x.comment_date)
    ]
    events = [
        CaseEventOut(
            id=str(e.id),
            date=_d(e.happened_at),
            action=e.action,
            user=e.user_label,
            detail=e.detail,
        )
        for e in sorted(row.events, key=lambda x: x.happened_at)
    ]

    nh = _dt(row.next_hearing) if row.next_hearing else None

    lit = row.litigation
    litigation_out = (
        CaseLitigationOut(
            claim_summary=lit.claim_summary or "",
            judgment_first=lit.judgment_first or "",
            judgment_appeal=lit.judgment_appeal or "",
            judgment_cassation=lit.judgment_cassation or "",
            damage_recovery_note=lit.damage_recovery_note or "",
            writ_request_note=lit.writ_request_note or "",
            writ_dispatch_note=lit.writ_dispatch_note or "",
            execution_proof_note=lit.execution_proof_note or "",
            defendant_execution_note=lit.defendant_execution_note or "",
            third_party_note=lit.third_party_note or "",
            updated_at=lit.updated_at.isoformat() if lit.updated_at else None,
        )
        if lit
        else CaseLitigationOut()
    )
    enf_list = [
        EnforcementProceedingOut(
            id=str(p.id),
            debtor_name=p.debtor_name or "",
            debtor_bin=p.debtor_bin,
            court_act_summary=p.court_act_summary or "",
            amount_total=float(p.amount_total),
            amount_main=float(p.amount_main),
            amount_fines=float(p.amount_fines),
            amount_fees=float(p.amount_fees),
            progress_notes=p.progress_notes or "",
            collected_amount=float(p.collected_amount),
            collection_doc_ref=p.collection_doc_ref or "",
            balance_remaining=float(p.balance_remaining),
            status_label=p.status_label or "",
            recorded_at=_d(p.recorded_at),
        )
        for p in sorted(row.enforcement_proceedings, key=lambda x: x.recorded_at)
    ]
    debt_list = [
        DebtRecoveryEntryOut(
            id=str(d.id),
            case_id=str(d.case_id) if d.case_id else None,
            counterparty_bin=d.counterparty_bin,
            debtor_name=d.debtor_name or "",
            debtor_status=d.debtor_status or "",
            debt_amount=float(d.debt_amount),
            paid_amount=float(d.paid_amount),
            written_off_amount=float(d.written_off_amount),
            work_summary=d.work_summary or "",
            recorded_at=_d(d.recorded_at),
        )
        for d in sorted(
            [x for x in row.debt_recovery_entries if x.case_id == row.id],
            key=lambda x: x.recorded_at,
        )
    ]

    return LegalCaseOut(
        id=str(row.id),
        case_number=row.case_number,
        court=row.court,
        court_instance=row.court_instance,
        case_type=row.case_type,
        status=row.status,
        outcome=row.outcome,
        party_role=row.party_role,
        opponent_type=row.opponent_type,
        plaintiff=row.plaintiff,
        defendant=row.defendant,
        company=row.company,
        company_bin=row.company_bin,
        claim_amount=float(fin.claim_amount),
        main_debt=float(fin.main_debt),
        state_fee=float(fin.state_fee),
        fines=float(fin.fines),
        rep_expenses=float(fin.rep_expenses),
        other_costs=float(fin.other_costs),
        paid_amount=float(fin.paid_amount),
        recovered_main=float(fin.recovered_main),
        recovered_fines=float(fin.recovered_fines),
        recovered_state_fee=float(fin.recovered_state_fee),
        recovered_rep_expenses=float(fin.recovered_rep_expenses),
        dispute_category=row.dispute_category or "procurement",
        assigned_lawyer=lawyer,
        branch_id=str(row.branch_id),
        assigned_lawyer_id=str(row.assigned_lawyer_id) if row.assigned_lawyer_id else None,
        branch=branch_name,
        city=row.city,
        judge=row.judge,
        filing_date=_d(row.filing_date),
        next_hearing=nh,
        payment_deadline=_d(row.payment_deadline) if row.payment_deadline else None,
        days_overdue=row.days_overdue,
        last_updated=_d(row.last_updated),
        risk_level=effective_significance(row),
        payments=payments,
        documents=documents,
        comments=comments,
        events=events,
        litigation=litigation_out,
        enforcement_proceedings=enf_list,
        debt_recovery_entries=debt_list,
    )
