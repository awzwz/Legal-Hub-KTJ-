from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import get_settings


def _redis():
    url = get_settings().redis_url
    if not url:
        return None
    return redis.from_url(url, decode_responses=True)


async def cache_get_json(key: str) -> Optional[Any]:
    r = _redis()
    if r is None:
        return None
    try:
        raw = await r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    finally:
        if r is not None:
            await r.aclose()


async def cache_set_json(key: str, value: Any, ttl_seconds: int) -> None:
    r = _redis()
    if r is None:
        return
    try:
        await r.set(key, json.dumps(value), ex=ttl_seconds)
    finally:
        await r.aclose()


def dashboard_stats_cache_key(user_id: str, suffix: str = "default") -> str:
    """Per-user cache key so director never shares branch lawyer aggregates."""
    h = hashlib.sha256(suffix.encode()).hexdigest()[:16]
    return f"legalhub:dashboard:stats:v1:{user_id}:{h}"


def dashboard_charts_cache_key(user_id: str, suffix: str = "default") -> str:
    h = hashlib.sha256(suffix.encode()).hexdigest()[:16]
    return f"legalhub:dashboard:charts:v1:{user_id}:{h}"
