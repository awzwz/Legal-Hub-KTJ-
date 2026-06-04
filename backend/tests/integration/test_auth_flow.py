"""Интеграционные тесты: login → /me → refresh."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_login_returns_access_and_refresh_cookie(app_client, seeded_user):
    r = await app_client.post("/api/v1/auth/login", json=seeded_user)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in r.cookies


async def test_login_bad_password_rejected(app_client, seeded_user):
    r = await app_client.post(
        "/api/v1/auth/login",
        json={"email": seeded_user["email"], "password": "wrong"},
    )
    assert r.status_code == 401


async def test_me_with_bearer(app_client, seeded_user):
    r = await app_client.post("/api/v1/auth/login", json=seeded_user)
    token = r.json()["access_token"]

    r2 = await app_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r2.status_code == 200
    assert r2.json()["email"] == seeded_user["email"]


async def test_refresh_rotates_cookie(app_client, seeded_user):
    r = await app_client.post("/api/v1/auth/login", json=seeded_user)
    old_refresh = r.cookies.get("refresh_token")

    r2 = await app_client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": old_refresh}
    )
    assert r2.status_code == 200
    new_refresh = r2.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    # Старый refresh после ротации больше не работает.
    r3 = await app_client.post(
        "/api/v1/auth/refresh", cookies={"refresh_token": old_refresh}
    )
    assert r3.status_code == 401
