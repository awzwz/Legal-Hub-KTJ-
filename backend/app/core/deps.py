from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import decode_token
from app.db.iam_session import get_identity_db
from app.models import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    x_dev_user_email: Annotated[Optional[str], Header(alias="X-Dev-User-Email")] = None,
) -> User:
    """Resolve the current user.

    Контракт:
    - Если пришёл валидный Bearer-токен — используем его всегда (даже в dev-режиме).
      Иначе ролевой ACL невозможно протестировать: фронт логинится как юрист,
      получает токен, а API всё равно возвращает данные «директора».
    - В режиме ``relax_auth`` без токена допускаем fallback: либо ``X-Dev-User-Email``,
      либо встроенный пользователь ``director@company.kz`` для удобства curl-проб.
    - В обычном режиме без токена — 401.
    """
    settings = get_settings()

    if creds is not None and creds.scheme.lower() == "bearer" and creds.credentials:
        try:
            payload = decode_token(creds.credentials)
        except JWTError:
            if not settings.relax_auth:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            payload = None
        if payload is not None:
            if payload.get("type") != "access":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject")
            try:
                user_id = UUID(sub)
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject") from exc
            user = await db.get(User, user_id)
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
            return user

    if settings.relax_auth:
        email = (x_dev_user_email or "").strip().lower() or "director@company.kz"
        r = await db.execute(select(User).where(User.email == email).limit(1))
        u = r.scalar_one_or_none()
        if u:
            return u
        r2 = await db.execute(select(User).where(User.email == "director@company.kz").limit(1))
        u2 = r2.scalar_one_or_none()
        if u2:
            return u2
        r3 = await db.execute(select(User).limit(1))
        u3 = r3.scalar_one_or_none()
        if u3:
            return u3
        raise HTTPException(status_code=500, detail="No users in database; run migrations and seed")

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def can_mutate(user: User) -> bool:
    return user.role != "accountant"


def user_sees_all_cases(user: User) -> bool:
    return user.role in ("director", "chief_lawyer", "accountant")


def user_branch_filter(user: User) -> Optional[UUID]:
    if user_sees_all_cases(user):
        return None
    if user.role == "branch_lawyer" and user.branch_id:
        return user.branch_id
    return None
