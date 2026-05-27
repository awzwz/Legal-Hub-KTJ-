"""Опциональная выгрузка больших отчётов в S3-совместимое хранилище."""

from __future__ import annotations

from typing import Optional

from app.core.config import get_settings


def s3_configured() -> bool:
    s = get_settings()
    return bool((s.s3_bucket or "").strip() and (s.s3_endpoint_url or "").strip())


def upload_bytes(*, key: str, body: bytes, content_type: str) -> Optional[str]:
    if not s3_configured():
        return None
    s = get_settings()
    import boto3
    from botocore.config import Config

    client = boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint_url or None,
        aws_access_key_id=s.aws_access_key_id or None,
        aws_secret_access_key=s.aws_secret_access_key or None,
        region_name=s.aws_region,
        config=Config(
            signature_version="s3v4",
            connect_timeout=8,
            read_timeout=120,
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    )
    bucket = s.s3_bucket
    assert bucket
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
    return f"s3://{bucket}/{key}"
