"""Защитный smoke-тест: после разбиения на доменные модули все ORM-классы
должны импортироваться через ``app.models`` без падения SQLAlchemy на
неразрешённых ``relationship``-строках."""

from __future__ import annotations


def test_models_import_resolves_relationships():
    from app.models import (
        AuditLog,
        Branch,
        Case,
        CaseComment,
        CaseDocument,
        CaseEvent,
        CaseFinance,
        CaseLawyer,
        CaseLitigation,
        Claim,
        CompanyFinanceSettings,
        DebtRecoveryEntry,
        EnforcementProceeding,
        InternalSyncDedupe,
        Notification,
        NotificationPreference,
        OutboxEvent,
        Payment,
        ProceduralDeadline,
        RefreshToken,
        ReportRequest,
        User,
    )
    from app.db.base import Base

    expected_tables = {
        "audit_logs",
        "branches",
        "cases",
        "comments",
        "documents",
        "events",
        "case_finances",
        "case_lawyers",
        "case_litigation",
        "claims",
        "company_finance_settings",
        "debt_recovery_entries",
        "enforcement_proceedings",
        "internal_sync_dedupe",
        "notifications",
        "notification_preferences",
        "outbox_events",
        "payments",
        "procedural_deadlines",
        "refresh_tokens",
        "report_requests",
        "users",
    }
    actual_tables = set(Base.metadata.tables.keys())
    missing = expected_tables - actual_tables
    assert not missing, f"Missing tables in metadata: {missing}"

    # Принудительно резолвим relationship-строки — SQLAlchemy упадёт здесь, если
    # после рефакторинга остались битые `relationship("Foo")`-ссылки.
    from sqlalchemy.orm import configure_mappers

    configure_mappers()
    # Просто прикасаемся к relationship-collection, чтобы Mapper их разрешил.
    _ = list(Case.__mapper__.relationships)
    _ = list(User.__mapper__.relationships)
