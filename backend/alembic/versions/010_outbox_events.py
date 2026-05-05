"""Transactional outbox for cross-service events (Redis stream publisher).

Revision ID: 010_outbox_events
Revises: 009_diversify_case_metadata
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "010_outbox_events"
down_revision: Union[str, None] = "009_diversify_case_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "outbox_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_outbox_events_published", "outbox_events", ["published_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_outbox_events_published", table_name="outbox_events")
    op.drop_table("outbox_events")
