"""Передача дел от увольняющегося юриста другому юристу + опц. деактивация.

Используется в сценарии «уход юриста»: директор/главный юрист выбирает
увольняющегося, целевого юриста, список дел — и одной транзакцией
переадресовывает все дела. По итогам:
- старому юристу отправляется СВОДНОЕ уведомление (1 запись вместо N);
- новому юристу — то же сводное «вам передано N дел»;
- chief/director — audit-уведомление о факте передачи;
- если стоит флажок `deactivate` — `users.is_active = false` (не удаляем, чтобы
  сохранить историю на закрытых делах).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, CaseEvent, Notification, User
from app.domain.audit_write import write_audit_log


async def get_user_cases_summary(
    db: AsyncSession, target_user_id: UUID
) -> list[dict]:
    """Список всех дел, назначенных на пользователя — для UI-выбора при передаче."""
    res = await db.execute(
        select(Case)
        .where(Case.assigned_lawyer_id == target_user_id)
        .order_by(Case.is_archived.asc(), Case.filing_date.desc())
    )
    rows = res.scalars().all()
    out: list[dict] = []
    for c in rows:
        out.append(
            {
                "id": str(c.id),
                "caseNumber": c.case_number,
                "company": c.company,
                "status": c.status,
                "outcome": c.outcome,
                "filingDate": c.filing_date.isoformat() if c.filing_date else None,
                "isArchived": bool(c.is_archived),
            }
        )
    return out


async def handover_cases(
    db: AsyncSession,
    actor: User,
    *,
    leaving_user_id: UUID,
    target_user_id: UUID,
    case_ids: Optional[list[UUID]] = None,
    deactivate: bool = False,
) -> dict:
    """Bulk-передача дел: leaving → target.

    Параметры:
        case_ids: список конкретных дел для передачи. Если None — передаются ВСЕ
            активные дела увольняющегося юриста.
        deactivate: если True, после передачи `users.is_active = false`.

    Только для роли director / chief_lawyer.
    """
    if actor.role not in ("director", "chief_lawyer"):
        raise HTTPException(
            status_code=403,
            detail="Передача дел доступна только директору и главному юристу",
        )
    if leaving_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Источник и получатель совпадают")

    leaving = await db.get(User, leaving_user_id)
    if not leaving:
        raise HTTPException(status_code=404, detail="Увольняющийся юрист не найден")
    target = await db.get(User, target_user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=400, detail="Получатель не найден или неактивен")

    # Загружаем дела к передаче (фильтр по списку — если задан).
    q = select(Case).where(Case.assigned_lawyer_id == leaving_user_id)
    if case_ids:
        q = q.where(Case.id.in_(case_ids))
    cases = list((await db.execute(q)).scalars().all())
    if not cases:
        raise HTTPException(status_code=400, detail="У юриста нет дел для передачи")

    now = datetime.now(timezone.utc)
    today = date.today()
    transferred_numbers: list[str] = []
    for c in cases:
        c.assigned_lawyer_id = target.id
        c.last_updated = today
        # Запись в case_events для аудита (видно в карточке дела).
        db.add(
            CaseEvent(
                id=uuid.uuid4(),
                case_id=c.id,
                action="Передача дела",
                user_label=actor.full_name,
                detail=f"assignedLawyer: {leaving.full_name} → {target.full_name}",
                happened_at=now,
                user_id=actor.id,
            )
        )
        transferred_numbers.append(c.case_number or str(c.id)[:8])

    n_transferred = len(cases)
    sample = ", ".join(transferred_numbers[:5])
    if n_transferred > 5:
        sample += f" и ещё {n_transferred - 5}"

    # СВОДНЫЕ уведомления — 1 запись на сторону, чтобы не было спама.
    def _add_summary(
        user_id: UUID, title: str, body: str, priority: str, ntype: str
    ) -> None:
        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=user_id,
                title=title,
                body=body,
                type=ntype,
                priority=priority,
                case_id=None,
                created_at=now,
            )
        )

    # 1) Увольняющемуся (если ещё активен — увидит до выхода)
    _add_summary(
        leaving.id,
        f"Ваши дела переданы ({n_transferred} шт.)",
        f"Дела переданы юристу {target.full_name}.\nНомера: {sample}",
        priority="medium",
        ntype="case_assigned",
    )

    # 2) Новому юристу
    _add_summary(
        target.id,
        f"Вам передано {n_transferred} дел",
        (
            f"От юриста {leaving.full_name}.\n"
            f"Номера: {sample}\n"
            f"Откройте «Реестр дел» и отфильтруйте по своему имени, чтобы увидеть полный список."
        ),
        priority="high",
        ntype="case_assigned",
    )

    # 3) Руководству (chief/director) — кроме самого инициатора
    chief_q = select(User).where(
        User.role.in_(("chief_lawyer", "director")),
        User.is_active.is_(True),
        User.id != actor.id,
    )
    for chief in (await db.execute(chief_q)).scalars().all():
        _add_summary(
            chief.id,
            f"Передача дел: {leaving.full_name} → {target.full_name}",
            (
                f"Инициатор: {actor.full_name}.\n"
                f"Передано: {n_transferred} дел.\n"
                f"Деактивация: {'да' if deactivate else 'нет'}."
            ),
            priority="low",
            ntype="case_status_changed",
        )

    # 4) Деактивация (опционально).
    if deactivate:
        leaving.is_active = False

    # 5) Audit log на сам факт.
    await write_audit_log(
        db,
        actor,
        action="handover",
        entity_type="user",
        entity_id=str(leaving_user_id),
        details=(
            f"Передача дел {leaving.full_name} → {target.full_name}, "
            f"{n_transferred} дел"
            + (" + деактивация" if deactivate else "")
        ),
        endpoint="POST /users/{id}/handover",
    )

    await db.commit()

    return {
        "ok": True,
        "transferred": n_transferred,
        "deactivated": bool(deactivate),
        "leavingUser": {"id": str(leaving.id), "fullName": leaving.full_name},
        "targetUser": {"id": str(target.id), "fullName": target.full_name},
    }
