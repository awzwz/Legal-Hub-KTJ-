"""Drop cases.pir_registry_section (restore pre–category-rubric behaviour).

Revision ID: 008_drop_pir_registry_again
Revises: 007_pir_registry_restore
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_drop_pir_registry_again"
down_revision: Union[str, None] = "007_pir_registry_restore"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE cases DROP COLUMN IF EXISTS pir_registry_section"))


def downgrade() -> None:
    op.add_column(
        "cases",
        sa.Column(
            "pir_registry_section",
            sa.String(512),
            nullable=False,
            server_default="",
        ),
    )
    op.alter_column("cases", "pir_registry_section", server_default=None)
