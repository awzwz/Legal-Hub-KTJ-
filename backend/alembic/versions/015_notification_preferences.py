"""Notification preferences: per-user toggle by notification type.

Revision ID: 015_notification_preferences
Revises: 014_kpi_and_deadlines

Каждый юрист может в Настройках включать/выключать получение уведомлений
по типам (заседания, дедлайны, изменения в делах, дневная сводка и пр.).
Если записи для типа нет — считаем что включено (default-on).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision = "015_notification_preferences"
down_revision = "014_kpi_and_deadlines"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("notification_type", sa.String(64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("user_id", "notification_type"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
