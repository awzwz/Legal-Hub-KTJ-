"""Remove FK cases.assigned_lawyer_id -> users (microservice boundary prep).

Revision ID: 011_drop_lawyer_fk (must fit alembic_version.version_num VARCHAR(32))
Revises: 010_outbox_events
"""

from typing import Sequence, Union

from alembic import op

revision: str = "011_drop_lawyer_fk"
down_revision: Union[str, None] = "010_outbox_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_assigned_lawyer_id_fkey")


def downgrade() -> None:
    # Восстановление FK может не пройти при «битых» ссылках; откат вручную при необходимости.
    pass
