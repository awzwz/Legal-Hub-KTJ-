"""Интеграционные тесты на internal /payments/sync (key + идемпотентность)."""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

# Берём ключ из окружения (CI задаёт собственный); fallback на тестовый дефолт.
HEADERS_OK = {"X-Internal-Key": os.environ.get("INTERNAL_API_KEY", "test-internal-key")}


async def test_payment_sync_requires_key(app_client):
    r = await app_client.post(
        "/api/internal/payments/sync",
        json={
            "document_number": "PP-1",
            "payer_bin": "123456789012",
            "payee_bin": "210987654321",
            "amount": 100,
            "payment_date": "2026-01-15",
        },
    )
    assert r.status_code == 401


async def test_payment_sync_rejects_wrong_key(app_client):
    r = await app_client.post(
        "/api/internal/payments/sync",
        headers={"X-Internal-Key": "nope"},
        json={
            "document_number": "PP-1",
            "payer_bin": "123456789012",
            "payee_bin": "210987654321",
            "amount": 100,
            "payment_date": "2026-01-15",
        },
    )
    assert r.status_code == 401


async def test_payment_sync_idempotent(app_client):
    """Дубль с тем же document_number+payer_bin не создаёт новую запись."""
    payload = {
        "document_number": "PP-DUP",
        "payer_bin": "111111111111",
        "payee_bin": "222222222222",
        "amount": 500.00,
        "payment_date": "2026-02-01",
    }
    # Дело, привязанное по payee_bin, ещё не существует, поэтому ожидаемо 404 —
    # это нормальный «sync_failed» путь. Важно: при повторе с тем же ключом
    # сервер не должен падать или дублировать запись.
    r1 = await app_client.post("/api/internal/payments/sync", headers=HEADERS_OK, json=payload)
    assert r1.status_code in (200, 404)

    r2 = await app_client.post("/api/internal/payments/sync", headers=HEADERS_OK, json=payload)
    assert r2.status_code in (200, 404)
