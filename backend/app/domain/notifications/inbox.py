"""Чтение и управление списком уведомлений пользователя."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, User
from app.domain import redis_cache

from .constants import AUTO_SYNC_TTL_SECONDS, autosync_redis_key
from .triggers import sync_notifications_for_user


async def list_notifications(db: AsyncSession, user: User) -> list[dict]:
    """GET /notifications — c автосинхронизацией не чаще раза в 5 минут."""
    auto_key = autosync_redis_key(user.id)
    last_sync = await redis_cache.cache_get_json(auto_key)
    if last_sync is None:
        try:
            await sync_notifications_for_user(db, user)
        except Exception:
            await db.rollback()
        else:
            await redis_cache.cache_set_json(
                auto_key,
                {"ts": datetime.now(timezone.utc).isoformat()},
                ttl_seconds=AUTO_SYNC_TTL_SECONDS,
            )

    res = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    rows = res.scalars().all()
    out: list[dict] = []
    for n in rows:
        body_clean = n.body or ""
        if "#dedup:" in body_clean:
            body_clean = "\n".join(
                ln for ln in body_clean.splitlines() if not ln.startswith("#dedup:")
            ).strip()
        out.append(
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "description": body_clean,
                "date": n.created_at.date().isoformat(),
                "createdAt": n.created_at.isoformat(),
                "read": n.read_at is not None,
                "caseId": str(n.case_id) if n.case_id else "",
                "priority": n.priority,
            }
        )
    return out


async def mark_notification_read(db: AsyncSession, user: User, notification_id: UUID) -> None:
    res = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    n = res.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        await db.commit()


async def mark_all_notifications_read(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
    await db.commit()


async def delete_notification(db: AsyncSession, user: User, notification_id: UUID) -> None:
    res = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    n = res.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(n)
    await db.commit()


async def clear_all_notifications(db: AsyncSession, user: User) -> int:
    """Удаляет все уведомления пользователя; возвращает количество удалённых."""
    res = await db.execute(
        delete(Notification).where(Notification.user_id == user.id).returning(Notification.id)
    )
    deleted = len(res.fetchall())
    await db.commit()
    return deleted
