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


def pytest_collection_modifyitems(config, items):
    """Авто-разметка тестов по расположению/имени файла, чтобы CI мог
    запускать только стабильные unit-тесты через `-m "not integration and not excel_template"`.
    """
    for item in items:
        path = str(item.fspath)
        if "tests/integration/" in path:
            item.add_marker(pytest.mark.integration)
        if "test_pir_excel_export" in path or "pir_compare" in path:
            item.add_marker(pytest.mark.excel_template)
