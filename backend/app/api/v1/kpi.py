from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import require_role
from app.core.roles import Role
from app.db.session import get_db
from app.models import User
from app.schemas.kpi import EbitdaUpsert
from app.domain import kpi_service

router = APIRouter(prefix="/kpi", tags=["kpi"])


@router.get("/overview", summary="KPI юр. службы (вся компания) за год")
async def kpi_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    year: int = Query(default=None, ge=2000, le=2100),
):
    y = year if year is not None else date.today().year
    data = await kpi_service.compute_overview(db, y)
    return JSONResponse(data)


@router.get("/branches", summary="KPI по филиалам")
async def kpi_branches(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    year: int = Query(default=None, ge=2000, le=2100),
):
    y = year if year is not None else date.today().year
    data = await kpi_service.compute_per_branch(db, y)
    return JSONResponse(data)


@router.get("/ebitda", summary="EBITDA на указанный год")
async def get_ebitda(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
    year: int = Query(default=None, ge=2000, le=2100),
):
    y = year if year is not None else date.today().year
    v = await kpi_service.get_ebitda(db, y)
    return JSONResponse({"year": y, "ebitda": float(v) if v is not None else None})


@router.put("/ebitda", summary="Установить EBITDA (только director/chief_lawyer)")
async def put_ebitda(
    body: EbitdaUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role(Role.DIRECTOR, Role.CHIEF_LAWYER))],
):
    row = await kpi_service.upsert_ebitda(db, body.year, body.ebitda)
    await db.commit()
    return JSONResponse({"year": row.year, "ebitda": float(row.ebitda)})
