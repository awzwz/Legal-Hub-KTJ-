"""Per-user toggles по типам уведомлений."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NotificationPreference, User

from .constants import NOTIFICATION_TYPES


async def load_enabled_types(db: AsyncSession, user_id: UUID) -> set[str]:
    """Множество типов, которые пользователь хочет получать.

    Если записей в preferences нет — считаем, что включены ВСЕ типы (default
    на первом заходе). Типы, добавленные позже без явной записи, тоже включены.
    """
    res = await db.execute(
        select(NotificationPreference.notification_type, NotificationPreference.enabled).where(
            NotificationPreference.user_id == user_id
        )
    )
    rows = res.all()
    if not rows:
        return set(NOTIFICATION_TYPES.keys())
    enabled = {t for (t, en) in rows if en}
    explicit = {t for (t, _) in rows}
    for t in NOTIFICATION_TYPES.keys():
        if t not in explicit:
            enabled.add(t)
    return enabled


async def get_user_preferences(db: AsyncSession, user: User) -> dict[str, bool]:
    """GET /notifications/preferences — список типов с состоянием для UI."""
    enabled = await load_enabled_types(db, user.id)
    return {t: (t in enabled) for t in NOTIFICATION_TYPES.keys()}


async def update_user_preferences(
    db: AsyncSession, user: User, prefs: dict[str, bool]
) -> None:
    """PUT /notifications/preferences — апсерт переключателей."""
    for ntype, enabled in prefs.items():
        if ntype not in NOTIFICATION_TYPES:
            continue
        existing = (
            await db.execute(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user.id,
                    NotificationPreference.notification_type == ntype,
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(
                NotificationPreference(
                    user_id=user.id, notification_type=ntype, enabled=bool(enabled)
                )
            )
        else:
            existing.enabled = bool(enabled)
    await db.commit()
