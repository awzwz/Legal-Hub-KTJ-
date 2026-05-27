"""FastAPI-зависимости для проверки прав текущего пользователя.

Использование:

    @router.post("/cases")
    async def create(..., _: None = Depends(require_can_mutate)): ...

    @router.delete("/users/{id}", dependencies=[Depends(require_role(Role.DIRECTOR))])
    async def delete_user(...): ...

Это центральная точка для ACL — вместо ad-hoc проверок ``user.role == "..."``
в каждом сервисе.
"""

from __future__ import annotations

from typing import Annotated, Callable, Iterable

from fastapi import Depends, HTTPException, status

from app.core.deps import can_mutate, get_current_user
from app.core.roles import Role
from app.models import User


def require_role(*allowed: Role) -> Callable[[User], User]:
    """Returns a FastAPI dependency that allows only users with one of `allowed` roles."""
    allowed_set = frozenset(allowed)

    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden for role '{user.role}'",
            )
        return user

    return _checker


async def require_can_mutate(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Read-only роли (например, accountant) сюда не проходят."""
    if not can_mutate(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mutations forbidden for this role",
        )
    return user


def in_roles(user: User, roles: Iterable[Role]) -> bool:
    return user.role in frozenset(roles)
