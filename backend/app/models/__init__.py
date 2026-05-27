"""Доменно-разбитые ORM-модели. Имена ре-экспортированы для обратной совместимости:
во всём проекте можно по-прежнему писать ``from app.models import User, Case``.
"""

from app.models.audit import AuditLog
from app.models.iam import Branch, RefreshToken, User, UserRole
from app.models.legal import (
    Case,
    CaseComment,
    CaseDocument,
    CaseEvent,
    CaseFinance,
    CaseLawyer,
    CaseLitigation,
    Claim,
    DebtRecoveryEntry,
    EnforcementProceeding,
    Payment,
    ProceduralDeadline,
)
from app.models.system import (
    CompanyFinanceSettings,
    InternalSyncDedupe,
    OutboxEvent,
    ReportRequest,
)
from app.models.workspace import Notification, NotificationPreference

__all__ = [
    "AuditLog",
    "Branch",
    "Case",
    "CaseComment",
    "CaseDocument",
    "CaseEvent",
    "CaseFinance",
    "CaseLawyer",
    "CaseLitigation",
    "Claim",
    "CompanyFinanceSettings",
    "DebtRecoveryEntry",
    "EnforcementProceeding",
    "InternalSyncDedupe",
    "Notification",
    "NotificationPreference",
    "OutboxEvent",
    "Payment",
    "ProceduralDeadline",
    "RefreshToken",
    "ReportRequest",
    "User",
    "UserRole",
]
