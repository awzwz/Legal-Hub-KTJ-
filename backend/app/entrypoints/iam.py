"""IAM: вход, refresh, пользователи."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, users
from app.core.config import get_settings
from app.factory import create_legalhub_app

_v1 = APIRouter()
_v1.include_router(auth.router)
_v1.include_router(users.router)

_iam_split = bool((get_settings().iam_database_url or "").strip())

app = create_legalhub_app(
    title="LegalHUB IAM",
    description="Аутентификация и пользователи (`/api/v1/auth`, `/api/v1/users`).",
    v1_router=_v1,
    include_internal_payments=False,
    enable_demo_seed=True,
    service_name="legalhub-iam",
    bootstrap_iam_tables=_iam_split,
    iam_identity_seed_only=_iam_split,
)
