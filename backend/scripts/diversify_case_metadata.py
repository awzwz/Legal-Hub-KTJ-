#!/usr/bin/env python3
"""
Тот же UPDATE, что в alembic 009_diversify_case_metadata — для уже загруженной БД,
если миграция не применилась или нужно заново выровнять распределение.

Из каталога backend (venv, DATABASE_URL в .env):

  python scripts/diversify_case_metadata.py

Идемпотентно.
"""

from __future__ import annotations

import asyncio

import sqlalchemy as sa

from app.db.session import SessionLocal

_SQL = sa.text(
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


async def main() -> None:
    async with SessionLocal() as session:
        res = await session.execute(_SQL)
        await session.commit()
        print("OK: diversify_case_metadata, rowcount:", res.rowcount)


if __name__ == "__main__":
    asyncio.run(main())
