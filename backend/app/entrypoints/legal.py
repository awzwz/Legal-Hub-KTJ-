"""Юридическое ядро: дела, филиалы, дашборд, внутренние интеграции (1C)."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from app.api.v1 import bin_check, branches, cases, claims, dashboard, kpi, procedural
from app.factory import create_legalhub_app

_v1 = APIRouter()
_v1.include_router(branches.router)
_v1.include_router(bin_check.router)
_v1.include_router(cases.router)
_v1.include_router(claims.router)
_v1.include_router(dashboard.router)
_v1.include_router(kpi.router)
_v1.include_router(procedural.router)


@asynccontextmanager
async def _legal_extra(_: FastAPI):
    from app.workers.outbox_dispatcher import start_outbox_dispatcher, stop_outbox_dispatcher

    await start_outbox_dispatcher()
    yield
    await stop_outbox_dispatcher()


app = create_legalhub_app(
    title="LegalHUB Legal Core",
    description="Дела, справочник филиалов, дашборд; `/api/internal` для обмена с 1C.",
    v1_router=_v1,
    include_internal_payments=True,
    enable_demo_seed=True,
    service_name="legalhub-legal",
    extra_lifespan=_legal_extra,
)
