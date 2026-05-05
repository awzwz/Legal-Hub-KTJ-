from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    director = "director"
    chief_lawyer = "chief_lawyer"
    branch_lawyer = "branch_lawyer"
    accountant = "accountant"


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    branch: Mapped[Optional["Branch"]] = relationship("Branch", lazy="joined")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number: Mapped[str] = mapped_column(String(64), nullable=False)
    court: Mapped[str] = mapped_column(String(512), nullable=False)
    court_instance: Mapped[str] = mapped_column(String(32), nullable=False)
    case_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    party_role: Mapped[str] = mapped_column(String(32), nullable=False)
    opponent_type: Mapped[str] = mapped_column(String(32), nullable=False)
    plaintiff: Mapped[str] = mapped_column(String(512), nullable=False)
    defendant: Mapped[str] = mapped_column(String(512), nullable=False)
    company: Mapped[str] = mapped_column(String(512), nullable=False)
    company_bin: Mapped[str] = mapped_column(String(12), nullable=False)
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    judge: Mapped[str] = mapped_column(String(255), nullable=False)
    filing_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_hearing: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_updated: Mapped[date] = mapped_column(Date, nullable=False)
    days_overdue: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Раздел шаблона ПИР внутри листа «истец»/«ответчик»:
    # procurement | transportation | labor | other | mediation. Дефолт совпадает с миграцией 012.
    dispute_category: Mapped[str] = mapped_column(
        String(32), nullable=False, default="procurement", server_default="procurement"
    )

    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    assigned_lawyer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    finances: Mapped["CaseFinance"] = relationship(
        "CaseFinance",
        back_populates="case",
        uselist=False,
        cascade="all, delete-orphan",
    )
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="case", cascade="all, delete-orphan")
    comments: Mapped[List["CaseComment"]] = relationship("CaseComment", back_populates="case", cascade="all, delete-orphan")
    events: Mapped[List["CaseEvent"]] = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan")
    documents: Mapped[List["CaseDocument"]] = relationship("CaseDocument", back_populates="case", cascade="all, delete-orphan")

    litigation: Mapped[Optional["CaseLitigation"]] = relationship(
        "CaseLitigation", back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    enforcement_proceedings: Mapped[List["EnforcementProceeding"]] = relationship(
        "EnforcementProceeding", back_populates="case", cascade="all, delete-orphan"
    )
    debt_recovery_entries: Mapped[List["DebtRecoveryEntry"]] = relationship(
        "DebtRecoveryEntry", back_populates="case", cascade="save-update, merge"
    )

    branch: Mapped["Branch"] = relationship("Branch", lazy="joined")
    assigned_lawyer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_lawyer_id], lazy="joined")


class CaseFinance(Base):
    __tablename__ = "case_finances"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    claim_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    main_debt: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    state_fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    rep_expenses: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    other_costs: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    # Materialized sum of payments; recomputed in transaction when payments change
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    # ПИР листы «истец» (кол. 13–15) / «ответчик» (кол. 14–17) / «3-лицо» (кол. 15–18):
    # взысканная сумма, независимо от платёжного реестра. Представительские заполняются только
    # когда КТЖ — ответчик/3-лицо (в шапке «истец» этой колонки нет).
    recovered_main: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_state_fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_rep_expenses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False, server_default="0"
    )

    case: Mapped["Case"] = relationship("Case", back_populates="finances")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("case_id", "document_number", name="uq_payment_case_document"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    document_number: Mapped[str] = mapped_column(String(128), nullable=False)
    payer: Mapped[str] = mapped_column(String(512), nullable=False)
    payee: Mapped[str] = mapped_column(String(512), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="payments")


class CaseDocument(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="documents")


class CaseEvent(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(512), nullable=False)
    user_label: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    case: Mapped["Case"] = relationship("Case", back_populates="events")


class CaseComment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_label: Mapped[str] = mapped_column(String(128), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    comment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    comment_date: Mapped[date] = mapped_column(Date, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="comments")


class CaseLitigation(Base):
    __tablename__ = "case_litigation"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    claim_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_first: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_appeal: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_cassation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    damage_recovery_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # ПИР «истец» кол. 16–18: заявление о выписке ИЛ, сопроводительное письмо, документ об исполнении
    writ_request_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    writ_dispatch_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    execution_proof_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # ПИР «ответчик» кол. 18: «информация об исполнении (№, дата документа)»
    defendant_execution_note: Mapped[str] = mapped_column(
        Text, default="", nullable=False, server_default=""
    )
    # ПИР «3-лицо»/«в качестве 3 лица» кол. 19: «примечание»
    third_party_note: Mapped[str] = mapped_column(
        Text, default="", nullable=False, server_default=""
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="litigation")


class EnforcementProceeding(Base):
    __tablename__ = "enforcement_proceedings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    debtor_name: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    debtor_bin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    court_act_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    amount_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_main: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_fees: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    progress_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    collected_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    collection_doc_ref: Mapped[str] = mapped_column(Text, default="", nullable=False)
    balance_remaining: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    status_label: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="enforcement_proceedings")


class DebtRecoveryEntry(Base):
    __tablename__ = "debt_recovery_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    counterparty_bin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    debtor_name: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    debtor_status: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    debt_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    written_off_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    work_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)

    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="debt_recovery_entries")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("refresh_tokens.id"), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)
    type: Mapped[str] = mapped_column(String(64), default="info", nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="medium", nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    endpoint: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OutboxEvent(Base):
    """Transactional outbox → Redis stream (at-least-once)."""

    __tablename__ = "outbox_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ReportRequest(Base):
    __tablename__ = "report_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type: Mapped[str] = mapped_column(String(64), nullable=False)
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    file_storage_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class InternalSyncDedupe(Base):
    """Idempotency for internal 1C-style payment pushes (document_number + payer_bin)."""

    __tablename__ = "internal_sync_dedupe"
    __table_args__ = (UniqueConstraint("source", "dedupe_key", name="uq_internal_sync_source_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    dedupe_key: Mapped[str] = mapped_column(String(256), nullable=False)
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
