from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.roles import READONLY_ROLES, ROLES_THAT_SEE_ALL_CASES, Role
from app.core.security import decode_token
from app.db.iam_session import get_identity_db
from app.models import User

CENTRAL_OFFICE_BRANCH_MARK = "Центральный аппарат"

security = HTTPBearer(auto_error=False)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    x_dev_user_email: Annotated[Optional[str], Header(alias="X-Dev-User-Email")] = None,
) -> User:
    # Bearer всегда приоритетнее dev-заголовка: иначе RBAC не протестировать
    # (логин выдаёт токен юриста, а endpoint всё равно работал бы как «директор»).
    # В relax_auth без токена допускаем X-Dev-User-Email; иначе — 401.
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
        by_email = await db.scalar(select(User).where(User.email == email).limit(1))
        if by_email:
            return by_email
        director = await db.scalar(
            select(User).where(User.email == "director@company.kz").limit(1)
        )
        if director:
            return director
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Dev user '{email}' not found; seed the database or pass a valid X-Dev-User-Email",
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def can_mutate(user: User) -> bool:
    return user.role not in READONLY_ROLES


def user_sees_all_cases(user: User) -> bool:
    if user.role in ROLES_THAT_SEE_ALL_CASES:
        return True
    # Сотрудники Центрального аппарата (любой роли) видят все филиалы.
    if user.branch and CENTRAL_OFFICE_BRANCH_MARK in (user.branch.name or ""):
        return True
    return False


def user_branch_filter(user: User) -> Optional[UUID]:
    if user_sees_all_cases(user):
        return None
    if user.role == Role.BRANCH_LAWYER and user.branch_id:
        return user.branch_id
    return None
