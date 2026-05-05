from fastapi import APIRouter

from app.api.v1 import audit, auth, branches, cases, dashboard, notifications, reports, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(branches.router)
api_router.include_router(cases.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(reports.router)
api_router.include_router(users.router)
