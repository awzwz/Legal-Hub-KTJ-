"""Интеграционные тесты на запрет мутаций и межфилиального доступа."""

from __future__ import annotations

from uuid import uuid4

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _claim_payload(*, branch_id=None):
    payload = {
        "counterpartyName": "Тестовый контрагент",
        "outgoingNumber": "TEST-1",
        "claimDate": "2026-06-01",
        "subject": "Проверка RBAC",
        "amount": 1000,
        "status": "not_collected",
    }
    if branch_id is not None:
        payload["branchId"] = str(branch_id)
    return payload


async def _create_user_token(*, role: str, branch_id=None) -> str:
    from app.core.security import create_access_token, hash_password
    from app.db.session import SessionLocal
    from app.models import User

    async with SessionLocal() as session:
        user = User(
            email=f"{role}-{uuid4()}@test.kz",
            password_hash=hash_password("Pass-w0rd!"),
            full_name=f"RBAC {role}",
            role=role,
            branch_id=branch_id,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return create_access_token(
        subject=str(user.id),
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
    )


async def _create_branches():
    from app.db.session import SessionLocal
    from app.models import Branch

    async with SessionLocal() as session:
        first = Branch(name=f"Филиал 1 {uuid4()}", city="Алматы")
        second = Branch(name=f"Филиал 2 {uuid4()}", city="Астана")
        session.add_all([first, second])
        await session.commit()
        await session.refresh(first)
        await session.refresh(second)
    return first.id, second.id


async def test_accountant_cannot_mutate_claims_or_deadlines(app_client):
    token = await _create_user_token(role="accountant")
    headers = {"Authorization": f"Bearer {token}"}

    claim = await app_client.post("/api/v1/claims", headers=headers, json=_claim_payload())
    deadline = await app_client.post(
        f"/api/v1/cases/{uuid4()}/deadlines",
        headers=headers,
        json={"kind": "response", "dueDate": "2026-06-15"},
    )

    assert claim.status_code == 403
    assert deadline.status_code == 403


async def test_branch_lawyer_cannot_create_claim_for_another_branch(app_client):
    own_branch_id, foreign_branch_id = await _create_branches()
    token = await _create_user_token(role="branch_lawyer", branch_id=own_branch_id)

    response = await app_client.post(
        "/api/v1/claims",
        headers={"Authorization": f"Bearer {token}"},
        json=_claim_payload(branch_id=foreign_branch_id),
    )

    assert response.status_code == 403
