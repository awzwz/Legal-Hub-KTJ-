"""Async Redis singleton (optional)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    import redis.asyncio as redis_async

_client: Optional["redis_async.Redis"] = None


async def get_redis():
    global _client
    from app.core.config import get_settings

    url = (get_settings().redis_url or "").strip()
    if not url:
        return None
    if _client is None:
        import redis.asyncio as redis_async

        _client = redis_async.from_url(url, decode_responses=True)
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
