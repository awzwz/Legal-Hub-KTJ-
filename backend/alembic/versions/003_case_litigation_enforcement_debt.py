"""case_litigation, enforcement_proceedings, debt_recovery_entries

Revision ID: 003_case_litigation
Revises: 002_notif_audit
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_case_litigation"
down_revision: Union[str, None] = "002_notif_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "case_litigation",
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("judgment_first", sa.Text(), nullable=False, server_default=""),
        sa.Column("judgment_appeal", sa.Text(), nullable=False, server_default=""),
        sa.Column("judgment_cassation", sa.Text(), nullable=False, server_default=""),
        sa.Column("damage_recovery_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "enforcement_proceedings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("debtor_name", sa.String(512), nullable=False, server_default=""),
        sa.Column("debtor_bin", sa.String(32), nullable=True),
        sa.Column("court_act_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("amount_total", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("amount_main", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("amount_fines", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("amount_fees", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("progress_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("collected_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("collection_doc_ref", sa.Text(), nullable=False, server_default=""),
        sa.Column("balance_remaining", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("status_label", sa.String(255), nullable=False, server_default=""),
        sa.Column("recorded_at", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
    )
    op.create_index("ix_enforcement_case_id", "enforcement_proceedings", ["case_id"])

    op.create_table(
        "debt_recovery_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("counterparty_bin", sa.String(32), nullable=True),
        sa.Column("debtor_name", sa.String(512), nullable=False, server_default=""),
        sa.Column("debtor_status", sa.String(255), nullable=False, server_default=""),
        sa.Column("debt_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("paid_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("written_off_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("work_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("recorded_at", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
    )
    op.create_index("ix_debt_recovery_case_id", "debt_recovery_entries", ["case_id"])
    op.create_index("ix_debt_recovery_bin", "debt_recovery_entries", ["counterparty_bin"])


def downgrade() -> None:
    op.drop_index("ix_debt_recovery_bin", table_name="debt_recovery_entries")
    op.drop_index("ix_debt_recovery_case_id", table_name="debt_recovery_entries")
    op.drop_table("debt_recovery_entries")
    op.drop_index("ix_enforcement_case_id", table_name="enforcement_proceedings")
    op.drop_table("enforcement_proceedings")
    op.drop_table("case_litigation")
