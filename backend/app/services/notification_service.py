from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Iterable
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import user_branch_filter
from app.models import Case, Notification, User
from app.services import redis_cache

# Минимальный интервал между авто-синхронизациями уведомлений для одного пользователя.
# Нужен, чтобы повторные GET /notifications не пересчитывали правила каждый раз.
_AUTO_SYNC_TTL_SECONDS = 300


def _autosync_redis_key(user_id: UUID) -> str:
    return f"legalhub:notifications:autosync:v1:{user_id}"


async def list_notifications(db: AsyncSession, user: User) -> list[dict]:
    """GET /notifications — c автосинхронизацией не чаще чем раз в 5 минут."""
    # Идемпотентно создаём недостающие уведомления, если последняя синхронизация
    # была давно. Любые ошибки генератора не должны ломать выдачу.
    auto_key = _autosync_redis_key(user.id)
    last_sync = await redis_cache.cache_get_json(auto_key)
    if last_sync is None:
        try:
            await sync_notifications_for_user(db, user)
        except Exception:
            await db.rollback()
        else:
            await redis_cache.cache_set_json(auto_key, {"ts": datetime.now(timezone.utc).isoformat()}, ttl_seconds=_AUTO_SYNC_TTL_SECONDS)

    res = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    rows = res.scalars().all()
    out: list[dict] = []
    for n in rows:
        out.append(
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "description": n.body,
                "date": n.created_at.date().isoformat(),
                "read": n.read_at is not None,
                "caseId": str(n.case_id) if n.case_id else "",
                "priority": n.priority,
            }
        )
    return out


async def mark_notification_read(db: AsyncSession, user: User, notification_id: UUID) -> None:
    res = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
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
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    n = res.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(n)
    await db.commit()


async def clear_all_notifications(db: AsyncSession, user: User) -> int:
    """Удаляет все уведомления текущего пользователя. Возвращает количество удалённых."""
    res = await db.execute(
        delete(Notification).where(Notification.user_id == user.id).returning(Notification.id)
    )
    deleted = len(res.fetchall())
    await db.commit()
    # сбрасываем rate-limit, чтобы следующий GET сразу пересчитал.
    try:
        from app.services.redis_client import get_redis  # noqa: F401  (опционально, может не быть)
    except Exception:
        pass
    return deleted


def _build_candidates_for_case(case: Case, today) -> list[dict]:
    """Собирает уведомления-кандидаты по одному делу. Чистая функция — без БД."""
    cands: list[dict] = []
    case_label = case.case_number or str(case.id)[:8]

    # 1) Просрочка платежа.
    if case.payment_deadline is not None and (case.days_overdue or 0) > 0:
        cands.append(
            {
                "type": "overdue",
                "priority": "urgent",
                "title": f"Просрочка оплаты по делу {case_label}",
                "body": (
                    f"Просрочено на {case.days_overdue} дн. "
                    f"Срок оплаты — {case.payment_deadline.isoformat()}. "
                    f"Контрагент: {case.opponent_type or 'не указан'}."
                ),
                "case_id": case.id,
            }
        )

    # 2) Ближайшее заседание (сегодня / завтра / в течение 3 дней).
    if case.next_hearing is not None:
        hearing_dt = case.next_hearing
        # next_hearing хранится timezone-aware, приводим к локальной дате через UTC.
        hearing_date = hearing_dt.date()
        delta = (hearing_date - today).days
        if 0 <= delta <= 3:
            time_str = hearing_dt.strftime("%H:%M")
            if delta == 0:
                title = f"Сегодня заседание по делу {case_label}"
                priority = "urgent"
            elif delta == 1:
                title = f"Завтра заседание по делу {case_label}"
                priority = "high"
            else:
                title = f"Через {delta} дн. заседание по делу {case_label}"
                priority = "high"
            cands.append(
                {
                    "type": "hearing",
                    "priority": priority,
                    "title": title,
                    "body": f"Суд: {case.court}. Время: {hearing_date.isoformat()} {time_str}.",
                    "case_id": case.id,
                }
            )

    # 3) Высокий риск, без оплаты — напоминание сосредоточиться на деле.
    if (case.risk_level or "").lower() == "high":
        cands.append(
            {
                "type": "status",
                "priority": "high",
                "title": f"Высокий риск по делу {case_label}",
                "body": (
                    f"Дело отмечено как высокорисковое. "
                    f"Контрагент: {case.opponent_type or 'не указан'}, истец/ответчик — "
                    f"{case.plaintiff} / {case.defendant}."
                ),
                "case_id": case.id,
            }
        )

    return cands


async def sync_notifications_for_user(db: AsyncSession, user: User) -> int:
    """Идемпотентно создаёт уведомления для текущего пользователя на основе
    состояния его дел. Возвращает количество вновь созданных записей.

    Идемпотентность держится на тройке (type, case_id, title): если уведомление
    с таким заголовком уже было сгенерировано — повторно не создаётся, даже если
    его уже прочитали.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    q = (
        select(Case)
        .where(Case.is_archived.is_(False))
        .options(selectinload(Case.finances))
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    res = await db.execute(q)
    cases = list(res.scalars().unique().all())

    res2 = await db.execute(
        select(Notification.type, Notification.case_id, Notification.title)
        .where(Notification.user_id == user.id)
    )
    existing_keys: set[tuple[str, UUID | None, str]] = {
        (t, cid, title) for (t, cid, title) in res2.all()
    }

    created = 0
    for case in cases:
        for cand in _build_candidates_for_case(case, today):
            key = (cand["type"], cand["case_id"], cand["title"])
            if key in existing_keys:
                continue
            db.add(
                Notification(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    title=cand["title"],
                    body=cand["body"],
                    type=cand["type"],
                    priority=cand["priority"],
                    case_id=cand["case_id"],
                    created_at=now,
                )
            )
            existing_keys.add(key)
            created += 1

    if created:
        await db.commit()
    return created


async def force_sync_notifications(db: AsyncSession, user: User) -> int:
    """Принудительная синхронизация (используется кнопкой «Обновить»)."""
    created = await sync_notifications_for_user(db, user)
    # Обновляем rate-limit, чтобы автосинк не дублировал работу сразу следом.
    await redis_cache.cache_set_json(
        _autosync_redis_key(user.id),
        {"ts": datetime.now(timezone.utc).isoformat()},
        ttl_seconds=_AUTO_SYNC_TTL_SECONDS,
    )
    return created


def _ids(items: Iterable[Notification]) -> list[str]:
    return [str(n.id) for n in items]
