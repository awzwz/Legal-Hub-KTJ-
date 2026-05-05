"""PIR plaintiff sheet: recovered amounts (cols 13–15) and execution notes (16–18).

Revision ID: 004_pir_plaintiff_cols
Revises: 003_case_litigation
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_pir_plaintiff_cols"
down_revision: Union[str, None] = "003_case_litigation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "case_finances",
        sa.Column("recovered_main", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "case_finances",
        sa.Column("recovered_fines", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "case_finances",
        sa.Column("recovered_state_fee", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "case_litigation",
        sa.Column("writ_request_note", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "case_litigation",
        sa.Column("writ_dispatch_note", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "case_litigation",
        sa.Column("execution_proof_note", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("case_litigation", "execution_proof_note")
    op.drop_column("case_litigation", "writ_dispatch_note")
    op.drop_column("case_litigation", "writ_request_note")
    op.drop_column("case_finances", "recovered_state_fee")
    op.drop_column("case_finances", "recovered_fines")
    op.drop_column("case_finances", "recovered_main")
