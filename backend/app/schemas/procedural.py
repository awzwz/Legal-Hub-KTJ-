from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import CamelModel


# Виды процедурных действий (синхронно с frontend/src/lib/proceduralKinds.ts)
_KINDS = {"response", "appeal", "cassation", "petition", "complaint", "other"}


class ProceduralDeadlineOut(CamelModel):
    id: UUID
    case_id: UUID
    case_number: Optional[str] = None  # для удобства фронта
    kind: str
    due_date: date
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Вычисляемое: «просрочено», если due_date < сегодня и completed_at is None
    is_overdue: bool = False


class ProceduralDeadlineCreate(CamelModel):
    kind: str = Field(min_length=1, max_length=32)
    due_date: date
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    @field_validator("kind")
    @classmethod
    def _check_kind(cls, v: str) -> str:
        if v not in _KINDS:
            raise ValueError(f"kind должен быть одним из: {sorted(_KINDS)}")
        return v


class ProceduralDeadlineUpdate(CamelModel):
    kind: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None  # передать null чтобы сбросить «выполнено»

    @field_validator("kind")
    @classmethod
    def _check_kind(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in _KINDS:
            raise ValueError(f"kind должен быть одним из: {sorted(_KINDS)}")
        return v
