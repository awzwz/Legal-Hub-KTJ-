"""M2M table case_lawyers: multiple lawyers per case.

Revision ID: 016_case_lawyers_m2m
Revises: 015_notification_preferences

Отчёты ПИР часто содержат совместные записи (напр. «Салемгереева А.Р., Умаров Т.К.»).
Текущая модель Case.assigned_lawyer_id допускает только одного юриста.
Эта таблица добавляет M2M-связь: одно дело — несколько юристов.
assigned_lawyer_id остаётся для «основного» исполнителя (обратная совместимость).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision = "016_case_lawyers_m2m"
down_revision = "015_notification_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "case_lawyers",
        sa.Column(
            "case_id",
            UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role_label",
            sa.String(64),
            nullable=False,
            server_default="executor",
        ),
        sa.PrimaryKeyConstraint("case_id", "user_id"),
    )


def downgrade() -> None:
    op.drop_table("case_lawyers")
