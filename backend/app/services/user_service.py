from __future__ import annotations

from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.security import hash_password, verify_password
from app.models import Branch, User


_ALLOWED_ROLES = {"director", "chief_lawyer", "branch_lawyer", "accountant"}


def _user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "name": u.full_name,
        "role": u.role,
        "branch": u.branch.name if u.branch else None,
        "branchId": str(u.branch_id) if u.branch_id else None,
        "email": u.email,
        "isActive": bool(u.is_active),
    }


async def list_active_users(db: AsyncSession) -> list[dict]:
    res = await db.execute(
        select(User)
        .options(joinedload(User.branch))
        .where(User.is_active.is_(True))
        .order_by(User.full_name)
    )
    return [_user_to_dict(u) for u in res.scalars().all()]


async def list_all_users(db: AsyncSession) -> list[dict]:
    res = await db.execute(
        select(User).options(joinedload(User.branch)).order_by(User.full_name)
    )
    return [_user_to_dict(u) for u in res.scalars().all()]


def _ensure_admin(actor: User) -> None:
    """Только директор и главный юрист могут управлять учётками."""
    if actor.role not in ("director", "chief_lawyer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Управление учётными записями доступно только директору и главному юристу",
        )


async def create_user(
    db: AsyncSession,
    actor: User,
    *,
    email: str,
    full_name: str,
    role: str,
    password: str,
    branch_id: Optional[UUID],
) -> dict:
    _ensure_admin(actor)

    role_normalized = role.strip().lower()
    if role_normalized not in _ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Недопустимая роль: {role}")

    email_normalized = email.strip().lower()
    if not email_normalized:
        raise HTTPException(status_code=400, detail="Email обязателен")

    full_name_clean = full_name.strip()
    if len(full_name_clean) < 2:
        raise HTTPException(status_code=400, detail="ФИО слишком короткое")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Пароль не короче 8 символов")

    dup = await db.execute(select(User).where(User.email == email_normalized))
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    if role_normalized == "branch_lawyer":
        if branch_id is None:
            raise HTTPException(status_code=400, detail="Юрист филиала должен быть привязан к филиалу")
        br = await db.get(Branch, branch_id)
        if br is None:
            raise HTTPException(status_code=404, detail="Филиал не найден")
        bid: Optional[UUID] = br.id
    else:
        bid = None

    new_user = User(
        id=uuid4(),
        email=email_normalized,
        password_hash=hash_password(password),
        full_name=full_name_clean,
        role=role_normalized,
        branch_id=bid,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user, attribute_names=["branch"])
    return _user_to_dict(new_user)


async def set_user_active(db: AsyncSession, actor: User, user_id: UUID, *, is_active: bool) -> dict:
    _ensure_admin(actor)
    target = await db.execute(select(User).options(joinedload(User.branch)).where(User.id == user_id))
    row = target.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if row.id == actor.id and not is_active:
        raise HTTPException(status_code=400, detail="Нельзя деактивировать самого себя")
    row.is_active = is_active
    await db.commit()
    return _user_to_dict(row)


async def change_own_password(
    db: AsyncSession,
    user: User,
    *,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль неверный")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Новый пароль не короче 8 символов")
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="Новый пароль совпадает с текущим")
    user.password_hash = hash_password(new_password)
    await db.commit()
