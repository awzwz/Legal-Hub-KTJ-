from __future__ import annotations

from functools import lru_cache
from typing import Literal, Optional

from pydantic import computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "staging", "production"] = "dev"

    database_url: str = "postgresql+asyncpg://legalhub:legalhub@127.0.0.1:5432/legalhub"
    iam_database_url: Optional[str] = None
    workspace_database_url: Optional[str] = None
    legal_database_url: Optional[str] = None

    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    internal_api_key: str = "dev-internal-key-change-in-production"
    redis_url: Optional[str] = None

    s3_endpoint_url: Optional[str] = None
    s3_bucket: Optional[str] = None
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"

    relax_auth: bool = False
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080"
    auto_ddl: bool = False

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    @computed_field  # type: ignore[prop-decorator]
    def database_url_sync(self) -> str:
        return self.database_url.replace("+asyncpg", "+psycopg", 1)

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.env == "production":
            if self.jwt_secret.startswith("change-me"):
                raise RuntimeError("JWT_SECRET must be overridden in production")
            if self.internal_api_key.startswith("dev-internal-key"):
                raise RuntimeError("INTERNAL_API_KEY must be overridden in production")
            if self.relax_auth:
                raise RuntimeError("RELAX_AUTH must be disabled in production")
            if self.auto_ddl:
                raise RuntimeError("AUTO_DDL must be disabled in production; use alembic")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
