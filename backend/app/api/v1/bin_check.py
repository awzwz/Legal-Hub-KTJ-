"""Эндпоинт онлайн-проверки БИН/ИИН через pk.adata.kz.

Мягкая проверка: если сервис недоступен или отдаёт неожиданный ответ — клиент получает
status=unknown (не блокируем создание дела). Если страница найдена и видно название —
возвращаем status=found + company_name. Если 404/redirect — status=not_found.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Annotated
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import get_current_user
from app.models import User
from app.utils.bin_validator import validate_bin_format

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bin", tags=["bin"])

_ADATA_URL = "https://pk.adata.kz/company/{bin}"
_TIMEOUT = 8.0
_USER_AGENT = "Mozilla/5.0 (compatible; LegalHub/1.0)"

# Регулярка для извлечения имени компании из HTML-страницы pk.adata.kz.
# Структура страниц меняется, но <title> и <h1> обычно содержат название.
_NAME_PATTERNS = (
    re.compile(r"<title>\s*([^<|]+?)\s*[|–\-]\s*[^<]*</title>", re.IGNORECASE | re.DOTALL),
    re.compile(r'<h1[^>]*>\s*([^<]+?)\s*</h1>', re.IGNORECASE | re.DOTALL),
)
_NOT_FOUND_MARKERS = ("компания не найдена", "не найдена", "404", "page not found")


def _extract_company_name(html: str) -> str | None:
    for pat in _NAME_PATTERNS:
        m = pat.search(html)
        if m:
            text = m.group(1).strip()
            text = re.sub(r"\s+", " ", text)
            if text and len(text) > 2 and "adata" not in text.lower():
                return text
    return None


@router.get("/check", summary="Проверить БИН/ИИН: формат + онлайн-наличие")
async def check_bin(
    user: Annotated[User, Depends(get_current_user)],
    value: str = Query(..., min_length=1, max_length=20),
):
    """Возвращает результат проверки БИН/ИИН.

    Поля ответа:
      - format_valid: bool — соответствует ли формату 12 цифр + контрольной сумме
      - format_error: str | None — текст ошибки локальной валидации
      - online_status: 'found' | 'not_found' | 'unknown'
      - company_name: str | None — название из реестра (если получили)
      - source_url: ссылка на страницу компании в pk.adata.kz
    """
    digits = "".join(c for c in str(value) if c.isdigit())
    fmt_ok, fmt_err = validate_bin_format(digits)
    payload: dict = {
        "format_valid": fmt_ok,
        "format_error": fmt_err,
        "online_status": "unknown",
        "company_name": None,
        "source_url": _ADATA_URL.format(bin=digits) if len(digits) == 12 else None,
    }
    if not fmt_ok:
        return payload

    url = _ADATA_URL.format(bin=digits)

    def _fetch() -> tuple[int, str, str]:
        """Returns (status_code, body, final_url). На редиректах urllib следует автоматически — финальный url укажет, был ли он."""
        req = Request(url, headers={"User-Agent": _USER_AGENT})
        try:
            with urlopen(req, timeout=_TIMEOUT) as resp:
                final = resp.geturl()
                body = resp.read(200_000).decode("utf-8", errors="replace")
                return resp.status, body, final
        except HTTPError as e:
            try:
                body = e.read(50_000).decode("utf-8", errors="replace")
            except Exception:
                body = ""
            return e.code, body, getattr(e, "url", url)

    try:
        status_code, html, final_url = await asyncio.wait_for(asyncio.to_thread(_fetch), timeout=_TIMEOUT + 2)
    except (URLError, asyncio.TimeoutError, TimeoutError) as e:
        logger.info("BIN online check timeout/network: %s", e)
        return payload
    except Exception as e:
        logger.warning("BIN online check failed: %s", e)
        return payload

    if status_code == 404:
        payload["online_status"] = "not_found"
        return payload
    if status_code >= 400:
        return payload
    # Если urllib после редиректов пришёл не на /company/<bin>, значит компания не найдена.
    if digits not in final_url:
        payload["online_status"] = "not_found"
        return payload
    if any(marker in html.lower() for marker in _NOT_FOUND_MARKERS):
        payload["online_status"] = "not_found"
        return payload

    name = _extract_company_name(html)
    if name:
        payload["online_status"] = "found"
        payload["company_name"] = name
    else:
        # Страница отвечает 200, но мы не уверены — оставим unknown
        payload["online_status"] = "unknown"
    return payload
