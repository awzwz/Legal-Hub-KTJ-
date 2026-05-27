"""Фабрика опциональных async-сессий для доменных БД (IAM / Legal / Workspace).

Каждый домен может иметь собственный `*_database_url` в настройках; если он
не задан — используется общий ``app.db.session.SessionLocal``. Этот модуль
устраняет дублирование lazy-init кода между ``iam_session``, ``legal_read_session``
и ``workspace_session``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Callable

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings


class OptionalDomainSession:
    """Лениво инициализирует движок и фабрику сессий для домена."""

    def __init__(self, *, name: str, url_getter: Callable[[Settings], str | None]) -> None:
        self._name = name
        self._url_getter = url_getter
        self._engine: AsyncEngine | None = None
        self._factory: async_sessionmaker[AsyncSession] | None = None

    def _url(self) -> str:
        return (self._url_getter(get_settings()) or "").strip()

    def is_configured(self) -> bool:
        return bool(self._url())

    def ensure(self) -> tuple[AsyncEngine, async_sessionmaker[AsyncSession]]:
        url = self._url()
        if not url:
            raise RuntimeError(f"{self._name.upper()}_DATABASE_URL not set")
        if self._engine is None:
            self._engine = create_async_engine(url, echo=False, pool_pre_ping=True)
            self._factory = async_sessionmaker(
                self._engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
            )
        assert self._factory is not None
        return self._engine, self._factory

    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield session from the dedicated DB or fall back to the main one."""
        if self.is_configured():
            _, factory = self.ensure()
            async with factory() as session:
                yield session
            return
        from app.db.session import SessionLocal

        async with SessionLocal() as session:
            yield session
