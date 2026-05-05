from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.iam_session import get_identity_db
from app.models import User
from app.schemas.auth import CreateUserBody
from app.services import audit_write, user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", summary="Active users (for UI switcher / filters)")
async def list_users(
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    rows = await user_service.list_active_users(db)
    return JSONResponse(rows)


@router.get("/all", summary="All users (admin: directory + статусы)")
async def list_users_all(
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if user.role not in ("director", "chief_lawyer"):
        raise HTTPException(status_code=403, detail="Доступ только директору / главному юристу")
    rows = await user_service.list_all_users(db)
    return JSONResponse(rows)


@router.post("", status_code=201, summary="Create new user (director / chief_lawyer)")
async def create_user_endpoint(
    body: CreateUserBody,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await user_service.create_user(
        db,
        user,
        email=str(body.email),
        full_name=body.full_name,
        role=body.role,
        password=body.password,
        branch_id=body.branch_id,
    )
    await audit_write.write_audit_log(
        db,
        user,
        action="create",
        entity_type="user",
        entity_id=out["id"],
        details=f"Создана учётная запись {out['email']} ({out['role']})",
    )
    await db.commit()
    return JSONResponse(out, status_code=201)


class _ToggleActiveBody(BaseModel):
    is_active: bool


@router.patch("/{user_id}/active", summary="Activate / deactivate user")
async def toggle_user_active(
    user_id: UUID,
    body: _ToggleActiveBody,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await user_service.set_user_active(db, user, user_id, is_active=body.is_active)
    await audit_write.write_audit_log(
        db,
        user,
        action="patch",
        entity_type="user",
        entity_id=str(user_id),
        details=f"Пользователь {'активирован' if body.is_active else 'деактивирован'}",
    )
    await db.commit()
    return JSONResponse(out)
