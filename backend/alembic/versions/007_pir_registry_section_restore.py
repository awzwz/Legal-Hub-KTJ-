"""Restore cases.pir_registry_section (рубрика листа «истец»).

Revision ID: 007_pir_registry_restore
Revises: 006_drop_pir_registry
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_pir_registry_restore"
down_revision: Union[str, None] = "006_drop_pir_registry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_column("cases", "pir_registry_section")
