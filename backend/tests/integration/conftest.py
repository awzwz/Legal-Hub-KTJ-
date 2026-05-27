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


@pytest_asyncio.fixture
async def app_client():
    """In-process ASGI client. Создаёт схему БД на старте."""
    import httpx

    from app.db.base import Base
    from app.db.session import engine
    from app.main import app

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture
async def seeded_user(app_client):
    """Создаёт юзера с известным паролем и возвращает email/password."""
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.security import hash_password
    from app.db.session import SessionLocal
    from app.models import User

    email = "branch1@test.kz"
    password = "Pass-w0rd!"
    async with SessionLocal() as session:  # type: AsyncSession
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
