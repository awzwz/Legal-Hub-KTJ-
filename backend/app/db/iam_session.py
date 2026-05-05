"""Сессия БД для IAM при `IAM_DATABASE_URL`; иначе используется основная `SessionLocal`."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.base import Base

_iam_engine: AsyncEngine | None = None
IamSessionLocal: async_sessionmaker[AsyncSession] | None = None


def _ensure_iam_engine() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    global _iam_engine, IamSessionLocal
    settings = get_settings()
    url = (settings.iam_database_url or "").strip()
    if not url:
        raise RuntimeError("IAM_DATABASE_URL not set")
    if _iam_engine is None:
        _iam_engine = create_async_engine(url, echo=False, pool_pre_ping=True)
        IamSessionLocal = async_sessionmaker(_iam_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    assert IamSessionLocal is not None
    return _iam_engine, IamSessionLocal


async def get_identity_db() -> AsyncGenerator[AsyncSession, None]:
    """Единая точка для auth/users: отдельная БД IAM или основная."""
    settings = get_settings()
    if (settings.iam_database_url or "").strip():
        _, factory = _ensure_iam_engine()
        async with factory() as session:
            yield session
    else:
        from app.db.session import SessionLocal

        async with SessionLocal() as session:
            yield session


async def create_iam_tables_if_needed() -> None:
    """Только таблицы идентичности для пустой IAM БД (dev / первый запуск)."""
    settings = get_settings()
    if not (settings.iam_database_url or "").strip():
        return
    from app.models import Branch, RefreshToken, User

    eng, _ = _ensure_iam_engine()
    async with eng.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[User.__table__, Branch.__table__, RefreshToken.__table__],
            )
        )
