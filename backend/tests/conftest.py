"""Общие фикстуры для тестов backend.

Если в окружении не выставлена `DATABASE_URL`, ставим SQLite-aiosqlite, чтобы
smoke-тесты, не зависящие от PostgreSQL, могли запускаться локально без БД.
Интеграционные тесты должны выставлять `DATABASE_URL` явно (см. CI).
"""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("ENV", "dev")
os.environ.setdefault("RELAX_AUTH", "true")
os.environ.setdefault("AUTO_DDL", "false")
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-prod")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
# Юнит-тесты не подключаются к БД; интеграционные пусть задают DATABASE_URL в CI/.env.


@pytest.fixture
def settings():
    from app.core.config import get_settings

    get_settings.cache_clear()
    return get_settings()
