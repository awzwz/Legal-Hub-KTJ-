"""Опциональное подключение к отдельной БД workspace (notifications / audit)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_ws_engine: AsyncEngine | None = None
WorkspaceSessionLocal: async_sessionmaker[AsyncSession] | None = None


def _ensure_workspace_engine() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    global _ws_engine, WorkspaceSessionLocal
    url = (get_settings().workspace_database_url or "").strip()
    if not url:
        raise RuntimeError("WORKSPACE_DATABASE_URL not set")
    if _ws_engine is None:
        _ws_engine = create_async_engine(url, echo=False, pool_pre_ping=True)
        WorkspaceSessionLocal = async_sessionmaker(_ws_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    assert WorkspaceSessionLocal is not None
    return _ws_engine, WorkspaceSessionLocal


async def get_workspace_db() -> AsyncGenerator[AsyncSession, None]:
    if (get_settings().workspace_database_url or "").strip():
        _, factory = _ensure_workspace_engine()
        async with factory() as session:
            yield session
    else:
        from app.db.session import SessionLocal

        async with SessionLocal() as session:
            yield session
