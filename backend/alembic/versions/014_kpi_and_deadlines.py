"""KPI: годовая EBITDA + процедурные дедлайны (вместо «days_overdue»).

Revision ID: 014_kpi_and_deadlines
Revises: 013_add_claims_table

Две новые таблицы:
- `company_finance_settings`: годовая EBITDA, по одной строке на год; нужна для KPI-2
  (% от EBITDA по сумме проигранных дел, где КТЖ — ответчик).
- `procedural_deadlines`: процедурные действия с дедлайнами (отзыв на иск, апелляция,
  кассация, ходатайство, жалоба, иное). Используется вместо фиктивного `cases.days_overdue`.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision = "014_kpi_and_deadlines"
down_revision = "013_add_claims_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_finance_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("year", sa.Integer(), nullable=False, unique=True),
        sa.Column("ebitda", sa.Numeric(20, 2), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "procedural_deadlines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("case_id", UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        # kind: response | appeal | cassation | petition | complaint | other
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_procedural_deadlines_case_id", "procedural_deadlines", ["case_id"])
    op.create_index("ix_procedural_deadlines_due_date", "procedural_deadlines", ["due_date"])


def downgrade() -> None:
    op.drop_index("ix_procedural_deadlines_due_date", table_name="procedural_deadlines")
    op.drop_index("ix_procedural_deadlines_case_id", table_name="procedural_deadlines")
    op.drop_table("procedural_deadlines")
    op.drop_table("company_finance_settings")
