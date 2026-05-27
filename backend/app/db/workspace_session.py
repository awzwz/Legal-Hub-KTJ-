"""Опциональное подключение к отдельной БД workspace (notifications / audit)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.optional_session import OptionalDomainSession

_workspace = OptionalDomainSession(name="workspace", url_getter=lambda s: s.workspace_database_url)


async def get_workspace_db() -> AsyncGenerator[AsyncSession, None]:
    async for s in _workspace.session():
        yield s
