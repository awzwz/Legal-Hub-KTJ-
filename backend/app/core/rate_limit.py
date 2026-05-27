"""Rate-limiter for sensitive endpoints (login, refresh, internal sync).

Лимиты применяются к IP клиента. По умолчанию выключены — включаются при
наличии ``REDIS_URL`` (общее хранилище счётчиков для всех worker'ов) или
in-memory для одного процесса (dev-режим).
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.core.config import get_settings


def _build_limiter() -> Limiter:
    settings = get_settings()
    storage_uri = (settings.redis_url or "").strip() or "memory://"
    return Limiter(
        key_func=get_remote_address,
        storage_uri=storage_uri,
        default_limits=[],
    )


limiter = _build_limiter()


async def _rate_limit_exceeded_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"error": True, "message": f"Rate limit exceeded: {exc.detail}", "code": 429},
    )


def attach_rate_limiter(app: FastAPI) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
