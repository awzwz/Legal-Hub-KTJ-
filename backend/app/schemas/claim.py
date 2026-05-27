from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import CamelModel
from app.utils.bin_validator import is_valid_bin_checksum


# Канонические статусы. Соответствие → метки UI:
#   collected      — взыскано
#   not_collected  — не взыскано
#   offset         — удержано в безакцептном порядке
#   recalculation  — перерасчёт
_ALLOWED_STATUSES = {"collected", "not_collected", "offset", "recalculation"}


def _normalize_bin(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    digits = "".join(c for c in str(value) if c.isdigit())
    if not digits:
        return None
    if len(digits) != 12:
        raise ValueError("БИН должен содержать 12 цифр")
    if not is_valid_bin_checksum(digits):
        raise ValueError("Неверная контрольная сумма БИН")
    return digits


class CaseShortOut(CamelModel):
    id: str
    case_number: str
    status: str
    party_role: str


class ClaimOut(CamelModel):
    id: str
    counterparty_name: str
    counterparty_bin: Optional[str] = None
    outgoing_number: str
    claim_date: date
    subject: str
    amount: float
    status: str
    status_detail: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[UUID] = None
    branch_name: Optional[str] = None
    assigned_lawyer_id: Optional[UUID] = None
    assigned_lawyer_name: Optional[str] = None
    case_id: Optional[UUID] = None
    case: Optional[CaseShortOut] = None
    created_at: datetime
    updated_at: datetime


class ClaimCreate(CamelModel):
    counterparty_name: str = Field(min_length=1, max_length=512)
    counterparty_bin: Optional[str] = None
    outgoing_number: str = Field(min_length=1, max_length=128)
    claim_date: date
    subject: str = Field(min_length=1)
    amount: Decimal = Field(ge=0)
    status: str = Field(default="not_collected")
    status_detail: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[UUID] = None
    assigned_lawyer_id: Optional[UUID] = None
    case_id: Optional[UUID] = None

    @field_validator("counterparty_bin")
    @classmethod
    def _bin_check(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_bin(v)

    @field_validator("status")
    @classmethod
    def _status_check(cls, v: str) -> str:
        if v not in _ALLOWED_STATUSES:
            raise ValueError(f"Статус должен быть одним из: {sorted(_ALLOWED_STATUSES)}")
        return v


class ClaimUpdate(CamelModel):
    counterparty_name: Optional[str] = Field(default=None, min_length=1, max_length=512)
    counterparty_bin: Optional[str] = None
    outgoing_number: Optional[str] = Field(default=None, min_length=1, max_length=128)
    claim_date: Optional[date] = None
    subject: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, ge=0)
    status: Optional[str] = None
    status_detail: Optional[str] = None
    notes: Optional[str] = None
    branch_id: Optional[UUID] = None
    assigned_lawyer_id: Optional[UUID] = None
    case_id: Optional[UUID] = None

    @field_validator("counterparty_bin")
    @classmethod
    def _bin_check(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_bin(v)

    @field_validator("status")
    @classmethod
    def _status_check(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in _ALLOWED_STATUSES:
            raise ValueError(f"Статус должен быть одним из: {sorted(_ALLOWED_STATUSES)}")
        return v
