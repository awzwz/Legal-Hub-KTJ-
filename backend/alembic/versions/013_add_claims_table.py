"""Add claims table for «Реестр претензий».

Revision ID: 013_add_claims_table
Revises: 012_pir_categories_fields

Сущность «Претензия» — досудебное требование, до того как (и если) дело попадает в суд.
Источник данных — реестр юриста в Excel (`реестр претензии 25-26гг.xlsx`).

Связи:
- branch_id → branches.id (опц., для доступа по филиалам)
- assigned_lawyer_id → users.id (опц.)
- case_id → cases.id (опц., если претензия переросла в иск; двусторонняя через `Case.claims`)
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision = "013_add_claims_table"
down_revision = "012_pir_categories_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "claims",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("counterparty_name", sa.String(512), nullable=False),
        sa.Column("counterparty_bin", sa.String(12), nullable=True),
        sa.Column("outgoing_number", sa.String(128), nullable=False),
        sa.Column("claim_date", sa.Date(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="not_collected"),
        sa.Column("status_detail", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("branch_id", UUID(as_uuid=True), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("assigned_lawyer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("case_id", UUID(as_uuid=True), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_claims_claim_date", "claims", ["claim_date"])
    op.create_index("ix_claims_counterparty_bin", "claims", ["counterparty_bin"])
    op.create_index("ix_claims_status", "claims", ["status"])
    op.create_index("ix_claims_branch_id", "claims", ["branch_id"])


def downgrade() -> None:
    op.drop_index("ix_claims_branch_id", table_name="claims")
    op.drop_index("ix_claims_status", table_name="claims")
    op.drop_index("ix_claims_counterparty_bin", table_name="claims")
    op.drop_index("ix_claims_claim_date", table_name="claims")
    op.drop_table("claims")
