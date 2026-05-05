from __future__ import annotations

from app.api.v1.router import api_router
from app.factory import create_legalhub_app

app = create_legalhub_app(
    title="LegalHUB API",
    description=(
        "REST API for LegalHUB КТЖ (монолит для локальной разработки). Public JSON uses **camelCase**. "
        "В Docker см. микросервисы `app.svc.iam`, `app.svc.legal`, `app.svc.workspace`, `app.svc.reporting`."
    ),
    v1_router=api_router,
    include_internal_payments=True,
    enable_demo_seed=True,
    service_name="legalhub-monolith",
)
