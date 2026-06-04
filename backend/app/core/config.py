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
    demo_seed_enabled: bool = False

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    @computed_field  # type: ignore[prop-decorator]
    def database_url_sync(self) -> str:
        return self.database_url.replace("+asyncpg", "+psycopg", 1)

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.env == "production":
            jwt = self.jwt_secret.strip().lower()
            internal_key = self.internal_api_key.strip().lower()
            if len(self.jwt_secret) < 64 or "change-me" in jwt or "__change_me" in jwt:
                raise RuntimeError("JWT_SECRET must be a generated secret of at least 64 characters in production")
            if len(self.internal_api_key) < 32 or "change-me" in internal_key or "__change_me" in internal_key:
                raise RuntimeError("INTERNAL_API_KEY must be a generated secret of at least 32 characters in production")
            if self.relax_auth:
                raise RuntimeError("RELAX_AUTH must be disabled in production")
            if self.auto_ddl:
                raise RuntimeError("AUTO_DDL must be disabled in production; use alembic")
            if self.demo_seed_enabled:
                raise RuntimeError("DEMO_SEED_ENABLED must be disabled in production")
            if not self.cookie_secure:
                raise RuntimeError("COOKIE_SECURE must be enabled in production")
            origins = [origin.strip().lower() for origin in self.cors_origins.split(",") if origin.strip()]
            if not origins or any(
                not origin.startswith("https://") or origin == "*" or "__" in origin for origin in origins
            ):
                raise RuntimeError("CORS_ORIGINS must contain only explicit https:// origins in production")
            database_url = self.database_url.strip().lower()
            if "__change_me" in database_url or "://legalhub:legalhub@" in database_url:
                raise RuntimeError("DATABASE_URL must use production credentials")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
