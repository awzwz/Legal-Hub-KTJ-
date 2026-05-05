"""PIR plaintiff sheet: registry section (рубрика реестра).

Revision ID: 005_pir_registry_section
Revises: 004_pir_plaintiff_cols
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_pir_registry_section"
down_revision: Union[str, None] = "004_pir_plaintiff_cols"
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


def downgrade() -> None:
    op.drop_column("cases", "pir_registry_section")
