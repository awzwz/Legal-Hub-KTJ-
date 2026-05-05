from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.services import audit_query_service

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", summary="Audit log (director / chief lawyer)")
async def list_audit(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=300, ge=1, le=500),
    user_id: Optional[str] = Query(default=None, alias="userId"),
    action: Optional[str] = Query(default=None),
):
    rows = await audit_query_service.list_audit_entries(
        db, user, limit=limit, user_id=user_id or "all", action=action or "all"
    )
    return JSONResponse(rows)
