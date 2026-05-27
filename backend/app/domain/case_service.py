from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import can_mutate, user_branch_filter
from app.core.roles import Role
from app.models import Branch, Case, CaseComment, CaseDocument, CaseEvent, CaseFinance, User

# Все связи, нужные для маппинга `Case -> LegalCaseOut` без N+1.
_CASE_RELATIONS = (
    "finances",
    "payments",
    "comments",
    "events",
    "documents",
    "litigation",
    "enforcement_proceedings",
    "debt_recovery_entries",
    "branch",
    "assigned_lawyer",
)


def _with_case_relations(stmt):
    return stmt.options(*(selectinload(getattr(Case, rel)) for rel in _CASE_RELATIONS))


VALID_DISPUTE_CATEGORIES = frozenset({"procurement", "transportation", "labor", "other", "mediation"})
from app.schemas.legal_case import (
    CaseDocumentOut,
    CreateCommentBody,
    CreateLegalCaseBody,
    LegalCaseOut,
    PatchCaseBody,
)
from app.domain.audit_write import write_audit_log
from app.domain.case_mapper import case_to_legal_case_out
from app.domain.demo_seed import parse_ui_datetime
from app.domain.outbox_service import enqueue_outbox


def _audit_snap(v: object, mx: int = 180) -> str:
    if v is None:
        return "—"
    s = str(v).replace("\n", " ")
    s = " ".join(s.split())
    return s if len(s) <= mx else s[: mx - 1] + "…"


def _money_eq(a: Decimal, b: Optional[float]) -> bool:
    if b is None:
        return False
    try:
        return a == Decimal(str(b))
    except (InvalidOperation, ValueError):
        return False


async def _fetch_case_row(db: AsyncSession, user: User, case_id: UUID) -> Optional[Case]:
    q = _with_case_relations(
        select(Case).where(Case.id == case_id, Case.is_archived.is_(False))
    )
    bfilter = user_branch_filter(user)
    if bfilter is not None:
        q = q.where(Case.branch_id == bfilter)
    res = await db.execute(q)
    return res.scalar_one_or_none()


async def list_cases_for_user(
    db: AsyncSession,
    user: User,
    *,
    status: Optional[str] = None,
    branch_id: Optional[UUID] = None,
    min_claim_amount: Optional[float] = None,
) -> list[LegalCaseOut]:
    q = _with_case_relations(select(Case).where(Case.is_archived.is_(False)))
    bfilter = user_branch_filter(user)
    if bfilter is not None:
        q = q.where(Case.branch_id == bfilter)
    elif branch_id is not None and user.role in (Role.DIRECTOR, Role.CHIEF_LAWYER):
        q = q.where(Case.branch_id == branch_id)
    if status:
        q = q.where(Case.status == status)
    if min_claim_amount is not None:
        q = q.join(CaseFinance, CaseFinance.case_id == Case.id).where(CaseFinance.claim_amount >= min_claim_amount)

    q = q.order_by(Case.filing_date.desc())
    res = await db.execute(q)
    rows = res.scalars().unique().all()
    return [case_to_legal_case_out(c) for c in rows]


async def get_case(db: AsyncSession, user: User, case_id: UUID) -> Optional[LegalCaseOut]:
    row = await _fetch_case_row(db, user, case_id)
    if not row:
        return None
    return case_to_legal_case_out(row)


_ROLE_LABELS: dict[str, str] = {
    Role.DIRECTOR.value: "Директор",
    Role.ACCOUNTANT.value: "Бухгалтер",
    Role.CHIEF_LAWYER.value: "Главный юрист",
}


def _role_label(user: User) -> str:
    return _ROLE_LABELS.get(user.role, "Юрист")


async def create_case(db: AsyncSession, user: User, body: CreateLegalCaseBody) -> LegalCaseOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    if user.role != Role.BRANCH_LAWYER or not user.branch_id:
        raise HTTPException(status_code=403, detail="Only branch lawyers can create cases")

    r = await db.execute(select(Branch).where(Branch.name == body.branch))
    br = r.scalar_one_or_none()
    if not br or br.id != user.branch_id:
        raise HTTPException(status_code=403, detail="Invalid branch for this user")

    case_id = uuid4()
    fid = date.today()
    if body.filing_date:
        fid = date.fromisoformat(body.filing_date[:10])
    lud = fid
    if body.last_updated:
        lud = date.fromisoformat(body.last_updated[:10])

    nh: Optional[datetime] = None
    if body.next_hearing and str(body.next_hearing).strip().lower() not in ("", "not_set", "null"):
        nh = parse_ui_datetime(str(body.next_hearing))

    pd: Optional[date] = None
    if body.payment_deadline:
        pd = date.fromisoformat(body.payment_deadline[:10])

    dispute_category = (body.dispute_category or "procurement").strip().lower()
    if dispute_category not in VALID_DISPUTE_CATEGORIES:
        dispute_category = "procurement"

    c = Case(
        id=case_id,
        case_number=body.case_number,
        court=body.court,
        court_instance=body.court_instance,
        case_type=body.case_type,
        status=body.status,
        outcome=body.outcome,
        party_role=body.party_role,
        opponent_type=body.opponent_type,
        plaintiff=body.plaintiff,
        defendant=body.defendant,
        company=body.company,
        company_bin=body.company_bin,
        city=body.city or "—",
        judge=body.judge,
        filing_date=fid,
        next_hearing=nh,
        payment_deadline=pd,
        last_updated=lud,
        days_overdue=int(body.days_overdue or 0),
        risk_level=body.risk_level,
        dispute_category=dispute_category,
        branch_id=br.id,
        assigned_lawyer_id=user.id,
    )
    db.add(c)
    db.add(
        CaseFinance(
            case_id=case_id,
            claim_amount=Decimal(str(body.claim_amount)),
            main_debt=Decimal(str(body.main_debt)),
            state_fee=Decimal(str(body.state_fee)),
            fines=Decimal(str(body.fines)),
            rep_expenses=Decimal(str(body.rep_expenses)),
            other_costs=Decimal(str(body.other_costs)),
            paid_amount=Decimal(str(body.paid_amount or 0)),
            recovered_main=Decimal(str(body.recovered_main)),
            recovered_fines=Decimal(str(body.recovered_fines)),
            recovered_state_fee=Decimal(str(body.recovered_state_fee)),
            recovered_rep_expenses=Decimal(str(body.recovered_rep_expenses)),
        )
    )
    db.add(
        CaseEvent(
            id=uuid4(),
            case_id=case_id,
            action="Дело создано",
            user_label=user.full_name,
            detail=None,
            happened_at=datetime.now(timezone.utc),
            user_id=user.id,
        )
    )
    await write_audit_log(
        db,
        user,
        action="create",
        entity_type="case",
        entity_id=str(case_id),
        details=f"Создано дело {body.case_number}",
    )
    await enqueue_outbox(
        db,
        "CaseCreated",
        {
            "caseId": str(case_id),
            "status": c.status,
            "previousStatus": None,
            "branchId": str(c.branch_id),
            "assignedLawyerId": str(c.assigned_lawyer_id) if c.assigned_lawyer_id else None,
        },
    )
    await db.commit()
    out = await get_case(db, user, case_id)
    if not out:
        raise HTTPException(status_code=500, detail="Case creation failed")
    return out


async def patch_case(db: AsyncSession, user: User, case_id: UUID, body: PatchCaseBody) -> LegalCaseOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    row = await _fetch_case_row(db, user, case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    fin = row.finances
    if fin is None:
        raise HTTPException(status_code=500, detail="Case has no finance row")

    changes: list[str] = []

    def note(label: str, old: object, new: object) -> None:
        if old != new:
            changes.append(f"{label}: {_audit_snap(old)} → {_audit_snap(new)}")

    def note_money(label: str, old: Decimal, new_val: Optional[float]) -> None:
        if new_val is None:
            return
        try:
            nd = Decimal(str(new_val))
        except (InvalidOperation, ValueError):
            raise HTTPException(status_code=400, detail=f"Invalid number for {label}") from None
        if old != nd:
            changes.append(f"{label}: {_audit_snap(old)} → {_audit_snap(nd)}")

    # Поля, у которых нет дополнительной обработки: сравниваем «как есть».
    # (label, attr) — label идёт в audit/timeline в camelCase, attr — имя в ORM/Pydantic.
    SCALAR_FIELDS: tuple[tuple[str, str], ...] = (
        ("status", "status"),
        ("riskLevel", "risk_level"),
        ("outcome", "outcome"),
        ("daysOverdue", "days_overdue"),
        ("courtInstance", "court_instance"),
        ("caseType", "case_type"),
        ("partyRole", "party_role"),
        ("opponentType", "opponent_type"),
    )
    # Текстовые поля: strip + усечение до max_len.
    STRIPPED_TEXT_FIELDS: tuple[tuple[str, str, int], ...] = (
        ("court", "court", 512),
        ("judge", "judge", 255),
        ("plaintiff", "plaintiff", 512),
        ("defendant", "defendant", 512),
        ("company", "company", 512),
        ("city", "city", 128),
    )
    # Денежные поля в `CaseFinance`.
    MONEY_FIELDS: tuple[tuple[str, str], ...] = (
        ("claimAmount", "claim_amount"),
        ("mainDebt", "main_debt"),
        ("stateFee", "state_fee"),
        ("fines", "fines"),
        ("repExpenses", "rep_expenses"),
        ("otherCosts", "other_costs"),
        ("paidAmount", "paid_amount"),
        ("recoveredMain", "recovered_main"),
        ("recoveredFines", "recovered_fines"),
        ("recoveredStateFee", "recovered_state_fee"),
        ("recoveredRepExpenses", "recovered_rep_expenses"),
    )

    old_status = row.status

    for label, attr in SCALAR_FIELDS:
        new_val = getattr(body, attr)
        if new_val is not None and new_val != getattr(row, attr):
            note(label, getattr(row, attr), new_val)
            setattr(row, attr, new_val)

    for label, attr, max_len in STRIPPED_TEXT_FIELDS:
        new_val = getattr(body, attr)
        if new_val is None:
            continue
        normalized = new_val.strip()
        if normalized != getattr(row, attr):
            note(label, getattr(row, attr), normalized)
            setattr(row, attr, normalized[:max_len])

    if body.next_hearing is not None:
        raw = str(body.next_hearing).strip().lower()
        if raw in ("", "not_set", "null"):
            nh: Optional[datetime] = None
        else:
            nh = parse_ui_datetime(str(body.next_hearing))
        old_nh = row.next_hearing
        old_repr = old_nh.date().isoformat() if old_nh else None
        new_repr = nh.date().isoformat() if nh else None
        if old_repr != new_repr:
            note("nextHearing", old_repr or "—", new_repr or "—")
            row.next_hearing = nh

    if body.payment_deadline is not None:
        raw = str(body.payment_deadline).strip().lower()
        if raw in ("", "null"):
            pd: Optional[date] = None
        else:
            pd = date.fromisoformat(str(body.payment_deadline)[:10])
        old_pd = row.payment_deadline
        old_pr = old_pd.isoformat() if old_pd else None
        new_pr = pd.isoformat() if pd else None
        if old_pr != new_pr:
            note("paymentDeadline", old_pr or "—", new_pr or "—")
            row.payment_deadline = pd

    if body.company_bin is not None and body.company_bin != row.company_bin:
        note("companyBIN", row.company_bin, body.company_bin)
        row.company_bin = body.company_bin

    if body.filing_date is not None:
        fd = date.fromisoformat(str(body.filing_date)[:10])
        if fd != row.filing_date:
            note("filingDate", row.filing_date.isoformat(), fd.isoformat())
            row.filing_date = fd

    if body.last_updated is not None:
        lud = date.fromisoformat(str(body.last_updated)[:10])
        if lud != row.last_updated:
            note("lastUpdated", row.last_updated.isoformat(), lud.isoformat())
            row.last_updated = lud

    if body.branch_id is not None and body.branch_id != row.branch_id:
        if user.role == Role.BRANCH_LAWYER:
            if user.branch_id != body.branch_id:
                raise HTTPException(status_code=403, detail="Нельзя перенести дело в другой филиал")
        br = await db.get(Branch, body.branch_id)
        if not br:
            raise HTTPException(status_code=400, detail="Филиал не найден")
        old_bn = row.branch.name if row.branch else str(row.branch_id)
        note("branch", old_bn, br.name)
        row.branch_id = br.id

    old_outcome = row.outcome
    new_lawyer_id_for_notify: Optional[UUID] = None
    old_lawyer_id_for_notify: Optional[UUID] = None
    if body.assigned_lawyer_id is not None and body.assigned_lawyer_id != row.assigned_lawyer_id:
        lu = await db.get(User, body.assigned_lawyer_id)
        if not lu or not lu.is_active:
            raise HTTPException(status_code=400, detail="Пользователь не найден или неактивен")
        if user.role == Role.BRANCH_LAWYER:
            if lu.branch_id is not None and lu.branch_id != row.branch_id:
                raise HTTPException(
                    status_code=403,
                    detail="Назначьте юриста из филиала дела или без привязки к филиалу",
                )
        old_ln = row.assigned_lawyer.full_name if row.assigned_lawyer else "—"
        note("assignedLawyer", old_ln, lu.full_name)
        # Запомним для уведомлений (создадим после успешного коммита).
        old_lawyer_id_for_notify = row.assigned_lawyer_id
        new_lawyer_id_for_notify = lu.id
        row.assigned_lawyer_id = lu.id

    for label, attr in MONEY_FIELDS:
        new_val = getattr(body, attr)
        if new_val is None or _money_eq(getattr(fin, attr), new_val):
            continue
        note_money(label, getattr(fin, attr), new_val)
        setattr(fin, attr, Decimal(str(new_val)))

    if body.dispute_category is not None:
        new_cat = body.dispute_category.strip().lower()
        if new_cat not in VALID_DISPUTE_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid dispute_category")
        if new_cat != row.dispute_category:
            note("disputeCategory", row.dispute_category, new_cat)
            row.dispute_category = new_cat

    if changes:
        row.last_updated = date.today()
        detail = "; ".join(changes)
        if len(detail) > 3900:
            detail = detail[:3890] + "…"
        db.add(
            CaseEvent(
                id=uuid4(),
                case_id=row.id,
                action="Обновление данных дела",
                user_label=user.full_name,
                detail=detail,
                happened_at=datetime.now(timezone.utc),
                user_id=user.id,
            )
        )
        await write_audit_log(
            db,
            user,
            action="edit",
            entity_type="case",
            entity_id=str(case_id),
            details=f"{row.case_number}: {detail}",
            endpoint="PATCH /cases/{id}",
        )
        await enqueue_outbox(
            db,
            "CaseUpdated",
            {
                "caseId": str(row.id),
                "status": row.status,
                "previousStatus": old_status,
                "branchId": str(row.branch_id),
                "assignedLawyerId": str(row.assigned_lawyer_id) if row.assigned_lawyer_id else None,
            },
        )

        # Триггеры уведомлений (inline, без cron'а).
        # Импорт здесь, чтобы избежать циклической зависимости.
        from app.domain.notification_service import create_inline_notification

        case_label = row.case_number or str(row.id)[:8]
        # 1) Назначен новый юрист — уведомить нового и снять со старого.
        if new_lawyer_id_for_notify is not None:
            await create_inline_notification(
                db,
                new_lawyer_id_for_notify,
                title=f"Вам назначено дело {case_label}",
                body=f"Контрагент: {row.company}. Истец/ответчик: {row.plaintiff} / {row.defendant}.",
                type="case_assigned",
                priority="medium",
                case_id=row.id,
                dedup_key=f"case_assigned:{row.id}:{new_lawyer_id_for_notify}",
            )
            if old_lawyer_id_for_notify is not None:
                await create_inline_notification(
                    db,
                    old_lawyer_id_for_notify,
                    title=f"Вы сняты с дела {case_label}",
                    body="Дело передано другому юристу.",
                    type="case_assigned",
                    priority="low",
                    case_id=row.id,
                    dedup_key=f"case_unassigned:{row.id}:{old_lawyer_id_for_notify}",
                )

        # 2) Сменился исход — уведомить chief/director.
        if body.outcome is not None and body.outcome != old_outcome:
            chief_res = await db.execute(
                select(User.id).where(
                    User.role.in_(("chief_lawyer", "director")),
                    User.is_active.is_(True),
                )
            )
            for (chief_uid,) in chief_res.all():
                await create_inline_notification(
                    db,
                    chief_uid,
                    title=f"Изменился исход дела {case_label}",
                    body=f"{old_outcome or '—'} → {body.outcome}. Юрист: {user.full_name}.",
                    type="case_status_changed",
                    priority="low",
                    case_id=row.id,
                    dedup_key=f"case_status_changed:{row.id}:{old_outcome}:{body.outcome}",
                )

    await db.commit()
    out = await get_case(db, user, case_id)
    if not out:
        raise HTTPException(status_code=404, detail="Case not found")
    return out


async def add_case_comment(
    db: AsyncSession,
    user: User,
    case_id: UUID,
    body: CreateCommentBody,
) -> LegalCaseOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    row = await _fetch_case_row(db, user, case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")

    cid = uuid4()
    db.add(
        CaseComment(
            id=cid,
            case_id=case_id,
            user_id=user.id,
            author_name=user.full_name,
            role_label=_role_label(user),
            text=body.text,
            comment_type=body.comment_type,
            comment_date=date.today(),
            likes=0,
        )
    )
    db.add(
        CaseEvent(
            id=uuid4(),
            case_id=case_id,
            action="Добавлен комментарий",
            user_label=user.full_name,
            detail=None,
            happened_at=datetime.now(timezone.utc),
            user_id=user.id,
        )
    )
    row.last_updated = date.today()
    await write_audit_log(
        db,
        user,
        action="comment",
        entity_type="comment",
        entity_id=str(cid),
        details="Добавлен комментарий",
    )
    await db.commit()
    out = await get_case(db, user, case_id)
    if not out:
        raise HTTPException(status_code=404, detail="Case not found")
    return out


async def add_case_document(
    db: AsyncSession,
    user: User,
    case_id: UUID,
    *,
    title: str,
    file_name: Optional[str],
) -> CaseDocumentOut:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    row = await _fetch_case_row(db, user, case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    base_title = title.strip()
    if not base_title:
        raise HTTPException(status_code=400, detail="Title required")
    fn = (file_name or "").strip()
    display = base_title if not fn else f"{base_title} ({fn})"
    display = display[:512]

    doc = CaseDocument(
        id=uuid4(),
        case_id=row.id,
        author_name=user.full_name,
        title=display,
        storage_key=None,
        mime_type=None,
        size_bytes=0,
        uploaded_by=user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await write_audit_log(
        db,
        user,
        action="create",
        entity_type="document",
        entity_id=str(doc.id),
        details=f"Документ к делу {row.case_number}: {display[:120]}",
    )
    await db.commit()
    await db.refresh(doc)
    return CaseDocumentOut(
        id=str(doc.id),
        title=doc.title,
        upload_date=doc.created_at.date().isoformat(),
        author=doc.author_name,
    )


async def remove_case_document(
    db: AsyncSession,
    user: User,
    case_id: UUID,
    document_id: UUID,
) -> None:
    if not can_mutate(user):
        raise HTTPException(status_code=403, detail="Mutations forbidden for this role")
    case = await _fetch_case_row(db, user, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    r = await db.execute(
        select(CaseDocument).where(CaseDocument.id == document_id, CaseDocument.case_id == case_id)
    )
    doc = r.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if user.role != Role.DIRECTOR:
        if doc.uploaded_by is not None:
            if doc.uploaded_by != user.id:
                raise HTTPException(status_code=403, detail="Only author or director can delete")
        else:
            if doc.author_name.strip() != user.full_name.strip():
                raise HTTPException(status_code=403, detail="Only author or director can delete")

    await db.execute(
        delete(CaseDocument).where(CaseDocument.id == document_id, CaseDocument.case_id == case_id)
    )
    await write_audit_log(
        db,
        user,
        action="edit",
        entity_type="document",
        entity_id=str(document_id),
        details=f"Удалён документ из дела {case.case_number}",
    )
    await db.commit()
