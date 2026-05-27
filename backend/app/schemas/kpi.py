from __future__ import annotations

from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import Field

from app.schemas.common import CamelModel


class KpiOverview(CamelModel):
    """Общие KPI по всей компании за год."""

    year: int
    # KPI-1: доля выигранных исков (мы — истцы)
    plaintiff_total: int
    plaintiff_won: int
    kpi1_percent: float  # % (0..100)
    # KPI-2: % от EBITDA по проигранным как ответчик
    defendant_lost_sum: float  # сумма «взысканной» с КТЖ (recovered_main + fines + rep + fee у defendant)
    ebitda: Optional[float] = None
    kpi2_percent: Optional[float] = None  # None если ebitda не задана
    kpi2_threshold: float = 2.0  # целевой порог


class KpiBranch(CamelModel):
    """KPI отдельного филиала."""

    branch_id: UUID
    branch_name: str
    plaintiff_total: int
    plaintiff_won: int
    kpi1_percent: float
    defendant_lost_sum: float
    kpi2_percent: Optional[float] = None  # None если ebitda не задана


class EbitdaOut(CamelModel):
    year: int
    ebitda: float


class EbitdaUpsert(CamelModel):
    year: int = Field(ge=2000, le=2100)
    ebitda: Decimal = Field(ge=0)
