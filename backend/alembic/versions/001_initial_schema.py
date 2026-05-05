"""LegalHUB initial schema

Revision ID: 001_initial
Revises:
Create Date: 2025-04-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("city", sa.String(128), nullable=True),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("jti", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("refresh_tokens.id"), nullable=True),
    )
    op.create_table(
        "cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_number", sa.String(64), nullable=False),
        sa.Column("court", sa.String(512), nullable=False),
        sa.Column("court_instance", sa.String(32), nullable=False),
        sa.Column("case_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("outcome", sa.String(32), nullable=False),
        sa.Column("party_role", sa.String(32), nullable=False),
        sa.Column("opponent_type", sa.String(32), nullable=False),
        sa.Column("plaintiff", sa.String(512), nullable=False),
        sa.Column("defendant", sa.String(512), nullable=False),
        sa.Column("company", sa.String(512), nullable=False),
        sa.Column("company_bin", sa.String(12), nullable=False),
        sa.Column("city", sa.String(128), nullable=False),
        sa.Column("judge", sa.String(255), nullable=False),
        sa.Column("filing_date", sa.Date(), nullable=False),
        sa.Column("next_hearing", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_deadline", sa.Date(), nullable=True),
        sa.Column("last_updated", sa.Date(), nullable=False),
        sa.Column("days_overdue", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(16), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("assigned_lawyer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_cases_branch_status", "cases", ["branch_id", "status"])
    op.create_index("ix_cases_filing_date", "cases", ["filing_date"])
    op.create_index("ix_cases_next_hearing", "cases", ["next_hearing"])
    op.create_index("ix_cases_company_bin", "cases", ["company_bin"])

    op.create_table(
        "case_finances",
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claim_amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("main_debt", sa.Numeric(15, 2), nullable=False),
        sa.Column("state_fee", sa.Numeric(15, 2), nullable=False),
        sa.Column("fines", sa.Numeric(15, 2), nullable=False),
        sa.Column("rep_expenses", sa.Numeric(15, 2), nullable=False),
        sa.Column("other_costs", sa.Numeric(15, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_number", sa.String(128), nullable=False),
        sa.Column("payer", sa.String(512), nullable=False),
        sa.Column("payee", sa.String(512), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.UniqueConstraint("case_id", "document_number", name="uq_payment_case_document"),
    )

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("storage_key", sa.String(1024), nullable=True),
        sa.Column("mime_type", sa.String(128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(512), nullable=False),
        sa.Column("user_label", sa.String(255), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("happened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )

    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("author_name", sa.String(255), nullable=False),
        sa.Column("role_label", sa.String(128), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("comment_type", sa.String(32), nullable=False),
        sa.Column("comment_date", sa.Date(), nullable=False),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "internal_sync_dedupe",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("dedupe_key", sa.String(256), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source", "dedupe_key", name="uq_internal_sync_source_key"),
    )


def downgrade() -> None:
    op.drop_table("internal_sync_dedupe")
    op.drop_table("comments")
    op.drop_table("events")
    op.drop_table("documents")
    op.drop_table("payments")
    op.drop_table("case_finances")
    op.drop_index("ix_cases_company_bin", table_name="cases")
    op.drop_index("ix_cases_next_hearing", table_name="cases")
    op.drop_index("ix_cases_filing_date", table_name="cases")
    op.drop_index("ix_cases_branch_status", table_name="cases")
    op.drop_table("cases")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("branches")
