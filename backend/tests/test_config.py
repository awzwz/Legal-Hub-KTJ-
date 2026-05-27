"""Юнит-тесты на конфиг: prod-guards не должны позволять слабые секреты."""

from __future__ import annotations

import pytest

from app.core.config import Settings


def test_dev_defaults_load():
    s = Settings(env="dev")
    assert s.auto_ddl is False
    assert s.cookie_secure is False
    assert s.cookie_samesite == "lax"


def test_production_rejects_default_jwt_secret():
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        Settings(env="production")


def test_production_rejects_relax_auth():
    with pytest.raises(RuntimeError, match="RELAX_AUTH"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            relax_auth=True,
        )


def test_production_rejects_auto_ddl():
    with pytest.raises(RuntimeError, match="AUTO_DDL"):
        Settings(
            env="production",
            jwt_secret="x" * 64,
            internal_api_key="y" * 32,
            auto_ddl=True,
        )


def test_production_with_strong_secrets_ok():
    s = Settings(
        env="production",
        jwt_secret="x" * 64,
        internal_api_key="y" * 32,
    )
    assert s.env == "production"
