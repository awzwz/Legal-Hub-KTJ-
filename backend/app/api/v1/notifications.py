from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.domain import notification_service
from app.domain.notification_service import NOTIFICATION_TYPES

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/preferences", summary="Get notification preferences for current user")
async def get_preferences(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    enabled = await notification_service.get_user_preferences(db, user)
    # Возвращаем список типов с лейблами + текущее состояние enabled.
    return JSONResponse(
        {
            "types": [
                {"type": t, "label": label, "enabled": enabled.get(t, True)}
                for t, label in NOTIFICATION_TYPES.items()
            ]
        }
    )


@router.put("/preferences", summary="Update notification preferences")
async def update_preferences(
    payload: Annotated[dict, Body(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    prefs = payload.get("preferences") or {}
    # Валидируем тип значений (bool) — отсекаем мусор.
    cleaned = {k: bool(v) for k, v in prefs.items() if isinstance(k, str)}
    await notification_service.update_user_preferences(db, user, cleaned)
    return JSONResponse({"ok": True, "saved": len(cleaned)})


@router.get("", summary="List notifications for current user")
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    rows = await notification_service.list_notifications(db, user)
    return JSONResponse(rows)


@router.post("/sync", summary="Recompute notifications for current user")
async def sync_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """Forced re-evaluation. Called from the «Обновить» button."""
    created = await notification_service.force_sync_notifications(db, user)
    return JSONResponse({"ok": True, "created": created})


@router.patch("/{notification_id}/read", summary="Mark one notification read")
async def mark_read(
    notification_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await notification_service.mark_notification_read(db, user, notification_id)
    return JSONResponse({"ok": True})


@router.post("/read-all", summary="Mark all notifications read")
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await notification_service.mark_all_notifications_read(db, user)
    return JSONResponse({"ok": True})


@router.delete("/{notification_id}", summary="Delete a single notification")
async def delete_one(
    notification_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await notification_service.delete_notification(db, user, notification_id)
    return JSONResponse({"ok": True})


@router.delete("", summary="Delete all notifications for current user")
async def delete_all(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    deleted = await notification_service.clear_all_notifications(db, user)
    return JSONResponse({"ok": True, "deleted": deleted})
