"""Опциональное подключение к отдельной БД legal (read replica / split)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.optional_session import OptionalDomainSession

_legal = OptionalDomainSession(name="legal", url_getter=lambda s: s.legal_database_url)


async def get_legal_db() -> AsyncGenerator[AsyncSession, None]:
    async for s in _legal.session():
        yield s
