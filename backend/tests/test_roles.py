"""Юнит-тесты на RBAC-хелперы."""

from __future__ import annotations

from types import SimpleNamespace

from app.core.deps import can_mutate, user_branch_filter, user_sees_all_cases
from app.core.roles import Role


def _user(role: Role, branch_id=None, branch_name=None):
    branch = SimpleNamespace(name=branch_name) if branch_name else None
    return SimpleNamespace(role=role.value, branch_id=branch_id, branch=branch)


def test_accountant_cannot_mutate():
    assert can_mutate(_user(Role.ACCOUNTANT)) is False


def test_director_can_mutate():
    assert can_mutate(_user(Role.DIRECTOR)) is True


def test_director_sees_all_cases():
    assert user_sees_all_cases(_user(Role.DIRECTOR)) is True


def test_branch_lawyer_does_not_see_all_cases():
    u = _user(Role.BRANCH_LAWYER, branch_id="b1", branch_name="Алматинский филиал")
    assert user_sees_all_cases(u) is False


def test_central_office_branch_lawyer_sees_all():
    u = _user(Role.BRANCH_LAWYER, branch_id="ca", branch_name="Центральный аппарат")
    assert user_sees_all_cases(u) is True


def test_branch_filter_for_branch_lawyer():
    u = _user(Role.BRANCH_LAWYER, branch_id="b1", branch_name="Алматинский филиал")
    assert user_branch_filter(u) == "b1"


def test_branch_filter_none_for_director():
    assert user_branch_filter(_user(Role.DIRECTOR)) is None
