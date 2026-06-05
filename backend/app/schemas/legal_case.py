from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.case_extensions import (
    CaseLitigationOut,
    DebtRecoveryEntryOut,
    EnforcementProceedingOut,
)
from app.schemas.common import CamelModel
from app.utils.bin_validator import is_valid_bin_checksum


def _normalize_and_validate_bin(value: str | None) -> str:
    if value is None:
        return value
    digits = "".join(c for c in str(value) if c.isdigit())
    if len(digits) != 12:
        raise ValueError("БИН/ИИН должен содержать ровно 12 цифр")
    if not is_valid_bin_checksum(digits):
        raise ValueError("Неверная контрольная сумма БИН/ИИН")
    return digits


class PaymentOut(CamelModel):
    id: str
    document_number: str
    payer: str
    payee: str
    date: str
    amount: float


class CaseDocumentOut(CamelModel):
    id: str
    title: str
    upload_date: str
    author: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: int = 0
    download_url: Optional[str] = None


class CreateCaseDocumentBody(CamelModel):
    """Register a document row (file bytes optional later via MinIO)."""

    title: str = Field(min_length=1, max_length=512)
    file_name: Optional[str] = Field(default=None, max_length=512, validation_alias="fileName")


class CaseCommentOut(BaseModel):
    """Nested comment matches mockData (no camelCase on inner keys except none)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    author: str
    role: str
    text: str
    type: str
    date: str
    likes: int


class CaseEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    date: str
    action: str
    user: str
    detail: Optional[str] = None


class LegalCaseOut(CamelModel):
    """Top-level LegalCase: camelCase for SPA."""

    id: str
    case_number: str
    court: str
    court_instance: str
    case_type: str
    status: str
    outcome: str
    party_role: str
    opponent_type: str
    plaintiff: str
    defendant: str
    company: str
    company_bin: str = Field(serialization_alias="companyBIN", validation_alias="companyBIN")
    claim_amount: float
    main_debt: float
    state_fee: float
    fines: float
    rep_expenses: float
    other_costs: float
    paid_amount: float
    recovered_main: float = 0.0
    recovered_fines: float = 0.0
    recovered_state_fee: float = 0.0
    recovered_rep_expenses: float = 0.0
    dispute_category: str = "procurement"
    assigned_lawyer: str
    branch_id: str = Field(serialization_alias="branchId", validation_alias="branchId")
    assigned_lawyer_id: Optional[str] = Field(
        default=None, serialization_alias="assignedLawyerId", validation_alias="assignedLawyerId"
    )
    branch: str
    city: str
    judge: str
    filing_date: str
    next_hearing: Optional[str]
    payment_deadline: Optional[str]
    days_overdue: int
    last_updated: str
    risk_level: str
    payments: list[PaymentOut]
    documents: list[CaseDocumentOut]
    comments: list[CaseCommentOut]
    events: list[CaseEventOut]
    litigation: CaseLitigationOut = Field(default_factory=CaseLitigationOut)
    enforcement_proceedings: list[EnforcementProceedingOut] = Field(default_factory=list)
    debt_recovery_entries: list[DebtRecoveryEntryOut] = Field(default_factory=list)


class CreateLegalCaseBody(CamelModel):
    """Payload from SPA when creating a case (matches LegalCase minus id and nested collections)."""

    case_number: str
    court: str
    court_instance: str
    case_type: str
    status: str
    outcome: str = "pending"
    party_role: str
    opponent_type: str
    plaintiff: str
    defendant: str
    company: str
    company_bin: str = Field(validation_alias="companyBIN")
    claim_amount: float
    main_debt: float
    state_fee: float
    fines: float
    rep_expenses: float
    other_costs: float
    paid_amount: float = 0
    recovered_main: float = 0
    recovered_fines: float = 0
    recovered_state_fee: float = 0
    recovered_rep_expenses: float = 0
    dispute_category: str = "procurement"
    branch: str
    city: str = "—"
    judge: str
    filing_date: Optional[str] = None
    next_hearing: Optional[str] = None
    payment_deadline: Optional[str] = None
    days_overdue: int = 0
    last_updated: Optional[str] = None
    risk_level: str

    @field_validator("company_bin")
    @classmethod
    def _check_bin(cls, v: str) -> str:
        return _normalize_and_validate_bin(v)


class PatchCaseBody(CamelModel):
    status: Optional[str] = None
    risk_level: Optional[str] = Field(default=None, validation_alias="riskLevel")
    outcome: Optional[str] = None
    next_hearing: Optional[str] = Field(default=None, validation_alias="nextHearing")
    payment_deadline: Optional[str] = Field(default=None, validation_alias="paymentDeadline")
    days_overdue: Optional[int] = Field(default=None, validation_alias="daysOverdue")
    court: Optional[str] = None
    judge: Optional[str] = None
    plaintiff: Optional[str] = None
    defendant: Optional[str] = None
    company: Optional[str] = None
    company_bin: Optional[str] = Field(default=None, validation_alias="companyBIN")
    city: Optional[str] = None
    court_instance: Optional[str] = Field(default=None, validation_alias="courtInstance")
    case_type: Optional[str] = Field(default=None, validation_alias="caseType")
    party_role: Optional[str] = Field(default=None, validation_alias="partyRole")
    opponent_type: Optional[str] = Field(default=None, validation_alias="opponentType")
    filing_date: Optional[str] = Field(default=None, validation_alias="filingDate")
    last_updated: Optional[str] = Field(default=None, validation_alias="lastUpdated")
    branch_id: Optional[UUID] = Field(default=None, validation_alias="branchId")
    assigned_lawyer_id: Optional[UUID] = Field(default=None, validation_alias="assignedLawyerId")
    claim_amount: Optional[float] = Field(default=None, validation_alias="claimAmount")
    main_debt: Optional[float] = Field(default=None, validation_alias="mainDebt")
    state_fee: Optional[float] = Field(default=None, validation_alias="stateFee")
    fines: Optional[float] = None
    rep_expenses: Optional[float] = Field(default=None, validation_alias="repExpenses")
    other_costs: Optional[float] = Field(default=None, validation_alias="otherCosts")
    paid_amount: Optional[float] = Field(default=None, validation_alias="paidAmount")
    recovered_main: Optional[float] = Field(default=None, validation_alias="recoveredMain")
    recovered_fines: Optional[float] = Field(default=None, validation_alias="recoveredFines")
    recovered_state_fee: Optional[float] = Field(default=None, validation_alias="recoveredStateFee")
    recovered_rep_expenses: Optional[float] = Field(default=None, validation_alias="recoveredRepExpenses")
    dispute_category: Optional[str] = Field(default=None, validation_alias="disputeCategory")

    @field_validator("company_bin")
    @classmethod
    def _check_bin(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _normalize_and_validate_bin(v)


class CreateCommentBody(CamelModel):
    text: str = Field(min_length=1, max_length=8000)
    comment_type: str = Field(default="info", validation_alias="type")
