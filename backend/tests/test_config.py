"""Юнит-тесты на конфиг: prod-guards не должны позволять слабые секреты.

Используем monkeypatch для изоляции от env CI — иначе pydantic-settings подсасывает
переменные ENV/JWT_SECRET/RELAX_AUTH из окружения и тесты ловят не тот guard.
"""

from __future__ import annotations

import pytest


_ENV_VARS_TO_CLEAR = (
    "ENV",
    "JWT_SECRET",
    "INTERNAL_API_KEY",
    "RELAX_AUTH",
    "AUTO_DDL",
    "DEMO_SEED_ENABLED",
    "COOKIE_SECURE",
    "COOKIE_SAMESITE",
    "DATABASE_URL",
    "REDIS_URL",
)


@pytest.fixture
def clean_env(monkeypatch):
    """Удаляем relevant env-переменные, чтобы тестировать поведение по умолчанию."""
    for k in _ENV_VARS_TO_CLEAR:
        monkeypatch.delenv(k, raising=False)
    return monkeypatch


def test_dev_defaults_load(clean_env):
    from app.core.config import Settings

    s = Settings(env="dev")
    assert s.env == "dev"
    assert s.auto_ddl is False
    assert s.cookie_secure is False
    assert s.cookie_samesite == "lax"


def test_production_rejects_default_jwt_secret(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        Settings(env="production")


def test_production_rejects_relax_auth(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="RELAX_AUTH"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="https://legalhub.example.kz",
            relax_auth=True,
        )


def test_production_rejects_auto_ddl(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="AUTO_DDL"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="https://legalhub.example.kz",
            auto_ddl=True,
        )


def test_production_rejects_placeholder_secrets(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        Settings(
            env="production",
            jwt_secret="__CHANGE_ME_HEX32__",
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="https://legalhub.example.kz",
        )


def test_production_rejects_demo_seed(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="DEMO_SEED_ENABLED"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="https://legalhub.example.kz",
            demo_seed_enabled=True,
        )


def test_production_rejects_insecure_cookie(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="COOKIE_SECURE"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cors_origins="https://legalhub.example.kz",
        )


def test_production_rejects_http_cors_origin(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="http://legalhub.example.kz",
        )


def test_production_rejects_default_database_credentials(clean_env):
    from app.core.config import Settings

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            cookie_secure=True,
            cors_origins="https://legalhub.example.kz",
        )


def test_production_with_strong_secrets_ok(clean_env):
    from app.core.config import Settings

    s = Settings(
        env="production",
        jwt_secret="x" * 64,
        internal_api_key="y" * 32,
        cookie_secure=True,
        cors_origins="https://legalhub.example.kz",
        database_url="postgresql+asyncpg://legalhub:strong-password@db:5432/legalhub",
    )
    assert s.env == "production"
