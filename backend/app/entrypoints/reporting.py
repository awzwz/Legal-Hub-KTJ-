"""Отчётность: заявки и выгрузки (ПИР и др.)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import reports
from app.factory import create_legalhub_app

_v1 = APIRouter()
_v1.include_router(reports.router)

app = create_legalhub_app(
    title="LegalHUB Reporting",
    description="Отчёты и выгрузки (`/api/v1/reports`).",
    v1_router=_v1,
    include_internal_payments=False,
    enable_demo_seed=False,
    service_name="legalhub-reporting",
)
