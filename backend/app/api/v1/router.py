from fastapi import APIRouter

from app.api.v1 import audit, auth, bin_check, branches, cases, claims, dashboard, kpi, notifications, procedural, reports, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(bin_check.router)
api_router.include_router(branches.router)
api_router.include_router(cases.router)
api_router.include_router(claims.router)
api_router.include_router(dashboard.router)
api_router.include_router(kpi.router)
api_router.include_router(procedural.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
