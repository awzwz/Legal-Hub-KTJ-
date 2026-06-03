"""Модели судебной части: дела, финансы, документы, события, исполнительные производства."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.db.base import Base


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
    # Раздел шаблона ПИР: procurement | transportation | labor | other | mediation.
    dispute_category: Mapped[str] = mapped_column(
        String(32), nullable=False, default="procurement", server_default="procurement"
    )

    # Cross-domain soft refs (нет FK на branches/users — IAM может жить в отдельной БД).
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    assigned_lawyer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    finances: Mapped["CaseFinance"] = relationship(
        "CaseFinance", back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="case", cascade="all, delete-orphan"
    )
    comments: Mapped[List["CaseComment"]] = relationship(
        "CaseComment", back_populates="case", cascade="all, delete-orphan"
    )
    events: Mapped[List["CaseEvent"]] = relationship(
        "CaseEvent", back_populates="case", cascade="all, delete-orphan"
    )
    documents: Mapped[List["CaseDocument"]] = relationship(
        "CaseDocument", back_populates="case", cascade="all, delete-orphan"
    )
    litigation: Mapped[Optional["CaseLitigation"]] = relationship(
        "CaseLitigation", back_populates="case", uselist=False, cascade="all, delete-orphan"
    )
    enforcement_proceedings: Mapped[List["EnforcementProceeding"]] = relationship(
        "EnforcementProceeding", back_populates="case", cascade="all, delete-orphan"
    )
    debt_recovery_entries: Mapped[List["DebtRecoveryEntry"]] = relationship(
        "DebtRecoveryEntry", back_populates="case", cascade="save-update, merge"
    )
    claims: Mapped[List["Claim"]] = relationship("Claim", back_populates="case")
    deadlines: Mapped[List["ProceduralDeadline"]] = relationship(
        "ProceduralDeadline", back_populates="case", cascade="all, delete-orphan"
    )

    branch: Mapped["Branch"] = relationship(  # type: ignore[name-defined]
        "Branch",
        primaryjoin="foreign(Case.branch_id) == Branch.id",
        lazy="joined",
        viewonly=True,
    )
    assigned_lawyer: Mapped[Optional["User"]] = relationship(  # type: ignore[name-defined]
        "User",
        primaryjoin="foreign(Case.assigned_lawyer_id) == User.id",
        lazy="joined",
        viewonly=True,
    )
    case_lawyers: Mapped[List["CaseLawyer"]] = relationship(
        "CaseLawyer", back_populates="case", cascade="all, delete-orphan"
    )


class CaseLawyer(Base):
    """M2M: одно дело — несколько юристов-исполнителей."""

    __tablename__ = "case_lawyers"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    # Cross-domain soft ref (IAM owns users).
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True)
    role_label: Mapped[str] = mapped_column(
        String(64), nullable=False, default="executor", server_default="executor"
    )

    case: Mapped["Case"] = relationship("Case", back_populates="case_lawyers")
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User",
        primaryjoin="foreign(CaseLawyer.user_id) == User.id",
        lazy="joined",
        viewonly=True,
    )


class Claim(Base):
    """Реестр претензий АО «Пассажирские перевозки» (досудебная стадия)."""

    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counterparty_name: Mapped[str] = mapped_column(String(512), nullable=False)
    counterparty_bin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    outgoing_number: Mapped[str] = mapped_column(String(128), nullable=False)
    claim_date: Mapped[date] = mapped_column(Date, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    # collected | not_collected | offset | recalculation
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="not_collected")
    status_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Cross-domain soft refs (IAM may live in a separate DB).
    branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    assigned_lawyer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    branch: Mapped[Optional["Branch"]] = relationship(  # type: ignore[name-defined]
        "Branch",
        primaryjoin="foreign(Claim.branch_id) == Branch.id",
        lazy="joined",
        viewonly=True,
    )
    assigned_lawyer: Mapped[Optional["User"]] = relationship(  # type: ignore[name-defined]
        "User",
        primaryjoin="foreign(Claim.assigned_lawyer_id) == User.id",
        lazy="joined",
        viewonly=True,
    )
    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="claims", foreign_keys=[case_id])


class CaseFinance(Base):
    __tablename__ = "case_finances"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    claim_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    main_debt: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    state_fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    rep_expenses: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    other_costs: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    # Materialized sum of payments; recomputed in transaction when payments change.
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_main: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    recovered_state_fee: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    recovered_rep_expenses: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False, server_default="0"
    )

    case: Mapped["Case"] = relationship("Case", back_populates="finances")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("case_id", "document_number", name="uq_payment_case_document"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
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
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    author_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Cross-domain soft ref to IAM.
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="documents")


class CaseEvent(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(512), nullable=False)
    user_label: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Cross-domain soft ref to IAM.
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    case: Mapped["Case"] = relationship("Case", back_populates="events")


class CaseComment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    # Cross-domain soft ref to IAM.
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_label: Mapped[str] = mapped_column(String(128), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    comment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    comment_date: Mapped[date] = mapped_column(Date, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="comments")


class CaseLitigation(Base):
    __tablename__ = "case_litigation"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True
    )
    claim_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_first: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_appeal: Mapped[str] = mapped_column(Text, default="", nullable=False)
    judgment_cassation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    damage_recovery_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    writ_request_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    writ_dispatch_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    execution_proof_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    defendant_execution_note: Mapped[str] = mapped_column(
        Text, default="", nullable=False, server_default=""
    )
    third_party_note: Mapped[str] = mapped_column(
        Text, default="", nullable=False, server_default=""
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="litigation")


class EnforcementProceeding(Base):
    __tablename__ = "enforcement_proceedings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    debtor_name: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    debtor_bin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    court_act_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    amount_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_main: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_fines: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    amount_fees: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    progress_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    collected_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    collection_doc_ref: Mapped[str] = mapped_column(Text, default="", nullable=False)
    balance_remaining: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    status_label: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)

    case: Mapped["Case"] = relationship("Case", back_populates="enforcement_proceedings")


class DebtRecoveryEntry(Base):
    __tablename__ = "debt_recovery_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True
    )
    counterparty_bin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    debtor_name: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    debtor_status: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    debt_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0"), nullable=False)
    written_off_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    work_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)

    case: Mapped[Optional["Case"]] = relationship("Case", back_populates="debt_recovery_entries")


class ProceduralDeadline(Base):
    """Процедурный дедлайн (response | appeal | cassation | petition | complaint | other)."""

    __tablename__ = "procedural_deadlines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    case: Mapped["Case"] = relationship("Case", back_populates="deadlines")
