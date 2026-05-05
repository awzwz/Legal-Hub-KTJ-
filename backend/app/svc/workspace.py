"""Рабочее пространство: уведомления и журнал аудита."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from app.api.v1 import audit, notifications
from app.factory import create_legalhub_app

_v1 = APIRouter()
_v1.include_router(notifications.router)
_v1.include_router(audit.router)


@asynccontextmanager
async def _workspace_extra(_: FastAPI):
    from app.workers.workspace_case_consumer import start_workspace_case_consumer, stop_workspace_case_consumer

    await start_workspace_case_consumer()
    yield
    await stop_workspace_case_consumer()


app = create_legalhub_app(
    title="LegalHUB Workspace",
    description="Уведомления и аудит (`/api/v1/notifications`, `/api/v1/audit`).",
    v1_router=_v1,
    include_internal_payments=False,
    enable_demo_seed=False,
    service_name="legalhub-workspace",
    extra_lifespan=_workspace_extra,
)
