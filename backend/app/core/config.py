from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://legalhub:legalhub@127.0.0.1:5432/legalhub"
    # Отдельная БД IAM (опционально; см. docker-compose.micro-advanced.yml)
    iam_database_url: Optional[str] = None
    workspace_database_url: Optional[str] = None
    legal_database_url: Optional[str] = None
    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    internal_api_key: str = "dev-internal-key-change-in-production"
    redis_url: Optional[str] = None
    # S3-совместимое хранилище для тяжёлых выгрузок (опционально)
    s3_endpoint_url: Optional[str] = None
    s3_bucket: Optional[str] = None
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    relax_auth: bool = False
    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080"
    auto_ddl: bool = True

    @computed_field  # type: ignore[prop-decorator]
    def database_url_sync(self) -> str:
        return self.database_url.replace("+asyncpg", "+psycopg", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
