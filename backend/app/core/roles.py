"""Роли пользователей. StrEnum — значение совпадает со строкой в БД,
поэтому код, сравнивающий ``user.role == "director"``, остаётся валидным."""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    DIRECTOR = "director"
    CHIEF_LAWYER = "chief_lawyer"
    BRANCH_LAWYER = "branch_lawyer"
    ACCOUNTANT = "accountant"


ALL_LAWYER_ROLES = frozenset({Role.CHIEF_LAWYER, Role.BRANCH_LAWYER})
ROLES_THAT_SEE_ALL_CASES = frozenset({Role.DIRECTOR, Role.CHIEF_LAWYER, Role.ACCOUNTANT})
READONLY_ROLES = frozenset({Role.ACCOUNTANT})
