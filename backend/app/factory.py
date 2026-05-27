"""Сборка FastAPI-приложений: общий lifespan, CORS, обработчики ошибок — для монолита и микросервисов."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

import app.models  # noqa: F401 — register ORM mappers
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.observability import attach_observability
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.domain.seed import run_seed_if_empty


@asynccontextmanager
async def _noop_extra(_: FastAPI) -> AsyncIterator[None]:
    yield


def create_lifespan(
    *,
    enable_demo_seed: bool,
    bootstrap_iam_tables: bool = False,
    iam_identity_seed_only: bool = False,
    extra: Optional[Callable[[FastAPI], Any]] = None,
):
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        settings = get_settings()
        if settings.relax_auth:
            logger.warning("RELAX_AUTH=true: endpoints accept X-Dev-User-Email without JWT. Do NOT use in production.")
        if bootstrap_iam_tables and (settings.iam_database_url or "").strip():
            from app.db.iam_session import create_iam_tables_if_needed

            await create_iam_tables_if_needed()
        if settings.auto_ddl:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        if enable_demo_seed:
            if iam_identity_seed_only and (settings.iam_database_url or "").strip():
                from app.db.iam_session import _ensure_iam_engine
                from app.domain.iam_seed import run_iam_identity_seed_if_empty

                _, factory = _ensure_iam_engine()
                async with factory() as session:
                    await run_iam_identity_seed_if_empty(session)
            else:
                async with SessionLocal() as session:
                    await run_seed_if_empty(session)
        cm = extra(app) if extra is not None else _noop_extra(app)
        async with cm:
            yield

    return lifespan


def attach_common_middleware_and_errors(app: FastAPI) -> None:
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException):
        detail = exc.detail
        msg = detail if isinstance(detail, str) else str(detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": True, "message": msg, "code": exc.status_code},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": True, "message": "Validation failed", "code": 422, "details": exc.errors()},
        )


def create_legalhub_app(
    *,
    title: str,
    description: str,
    v1_router: APIRouter,
    include_internal_payments: bool = False,
    enable_demo_seed: bool = True,
    service_name: str = "legalhub",
    extra_lifespan: Optional[Callable[[FastAPI], Any]] = None,
    bootstrap_iam_tables: bool = False,
    iam_identity_seed_only: bool = False,
) -> FastAPI:
    app = FastAPI(
        title=title,
        version="1.0.0",
        lifespan=create_lifespan(
            enable_demo_seed=enable_demo_seed,
            bootstrap_iam_tables=bootstrap_iam_tables,
            iam_identity_seed_only=iam_identity_seed_only,
            extra=extra_lifespan,
        ),
        description=description,
    )
    attach_observability(app, service_name=service_name)
    attach_common_middleware_and_errors(app)
    app.include_router(v1_router, prefix="/api/v1")
    if include_internal_payments:
        from app.api.internal import payments as internal_payments

        app.include_router(internal_payments.router, prefix="/api/internal")

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": title}

    return app
