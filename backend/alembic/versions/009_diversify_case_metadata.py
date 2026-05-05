"""Diversify case_type, status, outcome, risk, overdue, court_instance for existing rows.

Revision ID: 009_diversify_case_metadata
Revises: 008_drop_pir_registry_again

Импорт ПИР ранее заполнял почти все поля одинаково; правка скрипта импорта не меняет уже
загруженные строки. Эта миграция один раз обновляет метаданные по стабильному хэшу id,
чтобы дашборд и реестр показывали реалистичное распределение.

Downgrade намеренно пустой (откат потерял бы смысл разнообразия и затронул бы все дела).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_diversify_case_metadata"
down_revision: Union[str, None] = "008_drop_pir_registry_again"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
UPDATE cases AS c
SET
  case_type = CASE
    WHEN t.ph = 2 THEN 'executive'
    ELSE (
      ARRAY[
        'civil', 'civil', 'civil', 'civil',
        'administrative', 'corporate', 'labor', 'tax',
        'executive', 'criminal', 'other', 'civil'
      ]
    )[1 + t.ti]
  END,
  status = CASE t.ph
    WHEN 0 THEN 'closed'
    WHEN 1 THEN 'closed'
    WHEN 2 THEN 'execution'
    WHEN 3 THEN 'mediation'
    WHEN 4 THEN 'suspended'
    WHEN 5 THEN 'execution'
    WHEN 6 THEN 'active'
    WHEN 7 THEN 'active'
    WHEN 8 THEN 'active'
    WHEN 9 THEN 'active'
    ELSE 'active'
  END,
  outcome = CASE t.ph
    WHEN 0 THEN 'fully_satisfied'
    WHEN 1 THEN 'denied'
    ELSE 'pending'
  END,
  risk_level = CASE t.ph
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'high'
    WHEN 2 THEN 'medium'
    WHEN 3 THEN 'low'
    WHEN 4 THEN 'medium'
    WHEN 5 THEN 'high'
    WHEN 6 THEN 'high'
    WHEN 7 THEN 'low'
    WHEN 8 THEN 'medium'
    WHEN 9 THEN 'medium'
    ELSE 'low'
  END,
  days_overdue = CASE
    WHEN t.od_bucket = 0 AND t.ph >= 2 THEN 1 + (abs(hashtext(c.id::text || 'ov')) % 55)
    ELSE 0
  END,
  court_instance = CASE (abs(hashtext(c.id::text || 'ci')) % 10)
    WHEN 0 THEN 'appeal'
    WHEN 1 THEN 'cassation'
    ELSE 'first'
  END
FROM (
  SELECT
    id,
    abs(hashtext(id::text)) % 11 AS ph,
    abs(hashtext(id::text || 'ct')) % 12 AS ti,
    abs(hashtext(id::text || 'od')) % 5 AS od_bucket
  FROM cases
  WHERE is_archived = false
) AS t
WHERE c.id = t.id AND c.is_archived = false;
"""
        )
    )


def downgrade() -> None:
    pass
