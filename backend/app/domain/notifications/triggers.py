"""Генерация и автосинк уведомлений (heart of the notification system)."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import user_branch_filter
from app.core.roles import Role
from app.models import Case, Notification, ProceduralDeadline, User

from .constants import AUTO_SYNC_TTL_SECONDS, PROCEDURAL_KIND_LABELS, autosync_redis_key
from .preferences import load_enabled_types


def build_candidates_for_case(
    case: Case, deadlines: list[ProceduralDeadline], today: date
) -> list[dict]:
    """Собирает уведомления-кандидаты по одному делу. Чистая функция.

    Каждый кандидат имеет ``dedup_key`` — уникальный ключ для идемпотентности.
    Уведомление с тем же ключом (хранится в body как «#dedup:KEY») не создаётся
    повторно.
    """
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
                "dedup_key": f"overdue:{case.id}:{case.payment_deadline.isoformat()}",
            }
        )

    # 2) Ближайшее заседание: сегодня=urgent, завтра=high, 2-3 дня=medium, 4-7=low.
    if case.next_hearing is not None:
        hearing_dt = case.next_hearing
        hearing_date = hearing_dt.date()
        delta = (hearing_date - today).days
        if 0 <= delta <= 7:
            time_str = hearing_dt.strftime("%H:%M")
            if delta == 0:
                title = f"Сегодня заседание по делу {case_label}"
                priority = "urgent"
            elif delta == 1:
                title = f"Завтра заседание по делу {case_label}"
                priority = "high"
            elif delta <= 3:
                title = f"Через {delta} дн. заседание по делу {case_label}"
                priority = "medium"
            else:
                title = f"Через {delta} дн. заседание по делу {case_label}"
                priority = "low"
            cands.append(
                {
                    "type": "hearing",
                    "priority": priority,
                    "title": title,
                    "body": f"Суд: {case.court}. Время: {hearing_date.isoformat()} {time_str}.",
                    "case_id": case.id,
                    "dedup_key": f"hearing:{case.id}:{hearing_date.isoformat()}:{delta}",
                }
            )

    # 3) Процедурные дедлайны.
    for d in deadlines:
        if d.case_id != case.id or d.completed_at is not None:
            continue
        delta = (d.due_date - today).days
        kind_label = PROCEDURAL_KIND_LABELS.get(d.kind, d.kind)
        if delta < 0:
            cands.append(
                {
                    "type": "deadline_overdue",
                    "priority": "urgent",
                    "title": f"Просрочен: {kind_label} — дело {case_label}",
                    "body": (
                        f"Должно было быть подано {d.due_date.isoformat()}. "
                        f"Просрочено на {-delta} дн."
                        + (f"\nПримечание: {d.notes}" if d.notes else "")
                    ),
                    "case_id": case.id,
                    "dedup_key": f"deadline_overdue:{d.id}:{today.isoformat()}",
                }
            )
        elif delta in (1, 3, 7):
            priority = {1: "high", 3: "medium", 7: "low"}[delta]
            title = f"Через {delta} дн.: {kind_label} — дело {case_label}"
            cands.append(
                {
                    "type": "deadline_upcoming",
                    "priority": priority,
                    "title": title,
                    "body": (
                        f"До {d.due_date.isoformat()} (через {delta} дн.)."
                        + (f"\nПримечание: {d.notes}" if d.notes else "")
                    ),
                    "case_id": case.id,
                    "dedup_key": f"deadline_upcoming:{d.id}:{delta}",
                }
            )

    # 4) Высокая значимость — напоминание сосредоточиться на деле.
    from app.domain.case_mapper import compute_significance

    if compute_significance(case) == "high":
        cands.append(
            {
                "type": "status",
                "priority": "high",
                "title": f"Высокая значимость дела {case_label}",
                "body": (
                    f"Дело имеет высокую значимость (сумма / срочность / роль). "
                    f"Контрагент: {case.opponent_type or 'не указан'}, истец/ответчик — "
                    f"{case.plaintiff} / {case.defendant}."
                ),
                "case_id": case.id,
                "dedup_key": f"high_significance:{case.id}",
            }
        )

    return cands


def build_digest_candidate(
    user: User, cases: list[Case], deadlines: list[ProceduralDeadline], today: date
) -> Optional[dict]:
    """Дневная сводка для chief_lawyer / director (1 раз в день)."""
    if user.role not in (Role.CHIEF_LAWYER.value, Role.DIRECTOR.value):
        return None
    hearings_3d = sum(
        1
        for c in cases
        if c.next_hearing is not None and 0 <= (c.next_hearing.date() - today).days <= 3
    )
    overdue_deadlines = sum(
        1 for d in deadlines if d.completed_at is None and (d.due_date - today).days < 0
    )
    upcoming_deadlines = sum(
        1
        for d in deadlines
        if d.completed_at is None and 0 <= (d.due_date - today).days <= 3
    )
    if hearings_3d == 0 and overdue_deadlines == 0 and upcoming_deadlines == 0:
        return None
    body_parts = []
    if hearings_3d:
        body_parts.append(f"Заседаний в ближайшие 3 дня: {hearings_3d}")
    if overdue_deadlines:
        body_parts.append(f"Просроченных дедлайнов: {overdue_deadlines}")
    if upcoming_deadlines:
        body_parts.append(f"Дедлайнов в ближайшие 3 дня: {upcoming_deadlines}")
    return {
        "type": "daily_digest",
        "priority": "low",
        "title": f"Сводка на {today.strftime('%d.%m.%Y')}",
        "body": "\n".join(body_parts),
        "case_id": None,
        "dedup_key": f"digest:{user.id}:{today.isoformat()}",
    }


async def create_inline_notification(
    db: AsyncSession,
    user_id: UUID,
    *,
    title: str,
    body: str,
    type: str,
    priority: str,
    case_id: Optional[UUID] = None,
    dedup_key: Optional[str] = None,
) -> bool:
    """Создаёт уведомление inline (вне sync_notifications_for_user).

    Используется триггерами в case_service.py при изменениях. Применяет фильтр
    preferences и дедупликацию по dedup_key. Возвращает True если уведомление
    создано.
    """
    enabled = await load_enabled_types(db, user_id)
    if type not in enabled:
        return False
    if dedup_key:
        dedup_marker = f"#dedup:{dedup_key}"
        existing = (
            await db.execute(
                select(Notification.id).where(
                    Notification.user_id == user_id,
                    Notification.body.like(f"%{dedup_marker}%"),
                )
            )
        ).first()
        if existing:
            return False
        body = body + f"\n\n{dedup_marker}"
    db.add(
        Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            body=body,
            type=type,
            priority=priority,
            case_id=case_id,
            created_at=datetime.now(timezone.utc),
        )
    )
    return True


async def sync_notifications_for_user(db: AsyncSession, user: User) -> int:
    """Идемпотентно создаёт уведомления на основе состояния дел и дедлайнов.

    Возвращает количество новых записей. Идемпотентность — через ``dedup_key``,
    записываемый в body как маркер ``#dedup:KEY``.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    q = select(Case).where(Case.is_archived.is_(False)).options(selectinload(Case.finances))
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    res = await db.execute(q)
    cases = list(res.scalars().unique().all())
    case_ids = [c.id for c in cases]

    deadlines: list[ProceduralDeadline] = []
    if case_ids:
        res_d = await db.execute(
            select(ProceduralDeadline).where(ProceduralDeadline.case_id.in_(case_ids))
        )
        deadlines = list(res_d.scalars().all())

    enabled_types = await load_enabled_types(db, user.id)

    # Существующие dedup-ключи в body уже созданных уведомлений.
    res2 = await db.execute(select(Notification.body).where(Notification.user_id == user.id))
    existing_dedup: set[str] = set()
    for (body,) in res2.all():
        if body and "#dedup:" in body:
            for line in body.splitlines():
                if line.startswith("#dedup:"):
                    existing_dedup.add(line[len("#dedup:") :].strip())

    all_candidates: list[dict] = []
    for case in cases:
        all_candidates.extend(build_candidates_for_case(case, deadlines, today))
    digest = build_digest_candidate(user, cases, deadlines, today)
    if digest:
        all_candidates.append(digest)

    created = 0
    for cand in all_candidates:
        if cand["type"] not in enabled_types:
            continue
        dedup_key = cand.get("dedup_key")
        if dedup_key and dedup_key in existing_dedup:
            continue
        body_with_marker = (
            f"{cand['body']}\n\n#dedup:{dedup_key}" if dedup_key else cand["body"]
        )
        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                title=cand["title"],
                body=body_with_marker,
                type=cand["type"],
                priority=cand["priority"],
                case_id=cand["case_id"],
                created_at=now,
            )
        )
        if dedup_key:
            existing_dedup.add(dedup_key)
        created += 1

    if created:
        await db.commit()
    return created


async def force_sync_notifications(db: AsyncSession, user: User) -> int:
    """Принудительная синхронизация (кнопка «Обновить»)."""
    from app.domain import redis_cache

    created = await sync_notifications_for_user(db, user)
    await redis_cache.cache_set_json(
        autosync_redis_key(user.id),
        {"ts": datetime.now(timezone.utc).isoformat()},
        ttl_seconds=AUTO_SYNC_TTL_SECONDS,
    )
    return created
