"""Сессия БД для IAM при `IAM_DATABASE_URL`; иначе используется основная `SessionLocal`."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.db.base import Base
from app.db.optional_session import OptionalDomainSession

_iam = OptionalDomainSession(name="iam", url_getter=lambda s: s.iam_database_url)


def _ensure_iam_engine() -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
    return _iam.ensure()


async def get_identity_db() -> AsyncGenerator[AsyncSession, None]:
    """Единая точка для auth/users: отдельная БД IAM или основная."""
    async for s in _iam.session():
        yield s


async def create_iam_tables_if_needed() -> None:
    """Только таблицы идентичности для пустой IAM БД (dev / первый запуск)."""
    if not _iam.is_configured():
        return
    from app.models import Branch, RefreshToken, User

    eng, _ = _iam.ensure()
    async with eng.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[User.__table__, Branch.__table__, RefreshToken.__table__],
            )
        )
