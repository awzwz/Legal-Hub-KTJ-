"""Фикстуры для интеграционных тестов.

Тесты пропускаются, если ``DATABASE_URL`` не указывает на отдельную тестовую БД
(имя должно содержать ``test``). Это страховка от случайного запуска интеграционных
тестов на dev-БД с реальными данными.
"""

from __future__ import annotations

import os

import pytest
import pytest_asyncio

DATABASE_URL = os.environ.get("DATABASE_URL", "")
RUN_INTEGRATION = "test" in DATABASE_URL.lower()


def pytest_collection_modifyitems(config, items):
    if RUN_INTEGRATION:
        return
    skip_marker = pytest.mark.skip(reason="DATABASE_URL must point to a *_test database")
    for item in items:
        if "integration" in item.nodeid:
            item.add_marker(skip_marker)


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _schema_once():
    """Создаём схему один раз на сессию — иначе asyncpg pool привязывается к
    разным event-loops между тестами."""
    import app.models  # noqa: F401 - register ORM models before create_all
    from app.db.base import Base
    from app.db.session import engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="session")
async def app_client(_schema_once):
    """In-process ASGI client. Каждый тест получает чистую БД (truncate)."""
    import httpx
    from sqlalchemy import text

    from app.db.session import SessionLocal
    from app.main import app

    # Очищаем таблицы перед каждым тестом, чтобы не было пересечений.
    async with SessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' "
                "AND tablename NOT LIKE 'alembic_%'"
            )
        )
        tables = [r[0] for r in result.fetchall()]
        if tables:
            quoted = ", ".join(f'"{t}"' for t in tables)
            await session.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
            await session.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture(loop_scope="session")
async def seeded_user(app_client):
    """Создаёт юзера с известным паролем и возвращает email/password."""
    from app.core.security import hash_password
    from app.db.session import SessionLocal
    from app.models import User

    email = "branch1@test.kz"
    password = "Pass-w0rd!"
    async with SessionLocal() as session:
        u = User(
            email=email,
            password_hash=hash_password(password),
            full_name="Branch Lawyer 1",
            role="branch_lawyer",
            is_active=True,
        )
        session.add(u)
        await session.commit()
    return {"email": email, "password": password}
