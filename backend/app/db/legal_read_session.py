"""Опциональное подключение к отдельной БД legal (read replica / split)."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_legal_engine: AsyncEngine | None = None
LegalSessionLocal: async_sessionmaker[AsyncSession] | None = None


def _ensure_legal_engine() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    global _legal_engine, LegalSessionLocal
    url = (get_settings().legal_database_url or "").strip()
    if not url:
        raise RuntimeError("LEGAL_DATABASE_URL not set")
    if _legal_engine is None:
        _legal_engine = create_async_engine(url, echo=False, pool_pre_ping=True)
        LegalSessionLocal = async_sessionmaker(_legal_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    assert LegalSessionLocal is not None
    return _legal_engine, LegalSessionLocal


async def get_legal_db() -> AsyncGenerator[AsyncSession, None]:
    if (get_settings().legal_database_url or "").strip():
        _, factory = _ensure_legal_engine()
        async with factory() as session:
            yield session
    else:
        from app.db.session import SessionLocal

        async with SessionLocal() as session:
            yield session
