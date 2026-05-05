from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import Branch, User

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", summary="List branches (for case edit / filters)")
async def list_branches(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    res = await db.execute(select(Branch).order_by(Branch.name))
    rows = res.scalars().all()
    return JSONResponse(
        [{"id": str(b.id), "name": b.name, "city": b.city} for b in rows],
    )
