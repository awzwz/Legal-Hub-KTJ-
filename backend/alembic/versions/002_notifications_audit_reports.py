"""notifications, audit_logs, report_requests, extra branches

Revision ID: 002_notif_audit
Revises: 001_initial
Create Date: 2026-05-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_notif_audit"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("type", sa.String(64), nullable=False, server_default="info"),
        sa.Column("priority", sa.String(32), nullable=False, server_default="medium"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read_at"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False, server_default=""),
        sa.Column("entity_id", sa.String(64), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("endpoint", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_created", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_user", "audit_logs", ["user_id"])

    op.create_table(
        "report_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("report_type", sa.String(64), nullable=False),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("file_storage_key", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_report_requests_user_created", "report_requests", ["user_id", "created_at"])

    # Branches referenced by demo dataset (mock UI)
    op.execute(
        sa.text(
            """
            INSERT INTO branches (id, name, city) VALUES
            ('11111111-1111-1111-1111-111111111105'::uuid, 'Западный', 'Актобе'),
            ('11111111-1111-1111-1111-111111111106'::uuid, 'Экспресс', 'Павлодар')
            ON CONFLICT (name) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_report_requests_user_created", table_name="report_requests")
    op.drop_table("report_requests")
    op.drop_index("ix_audit_logs_user", table_name="audit_logs")
    op.drop_index("ix_audit_logs_created", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_notifications_user_read", table_name="notifications")
    op.drop_table("notifications")
    op.execute(
        sa.text(
            "DELETE FROM branches WHERE id IN "
            "('11111111-1111-1111-1111-111111111105'::uuid, '11111111-1111-1111-1111-111111111106'::uuid)"
        )
    )
