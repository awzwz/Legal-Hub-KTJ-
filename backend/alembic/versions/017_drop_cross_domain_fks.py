"""Drop cross-domain FK constraints (true microservices boundary).

Каждый сервис в перспективе живёт в своей БД (iam_db / legal_db / workspace_db),
поэтому FK между доменами становится физически невозможен. Этой миграцией мы
снимаем те constraint'ы, которые пересекают границы доменов, и оставляем колонки
как «soft references» (UUID без FK). На колонки добавляются индексы, чтобы
запросы по ним оставались быстрыми.

Внутри-доменные FK сохраняются: они корректны и нужны для целостности
(``cases.id`` → ``case_finances.case_id`` и т.п.).

Revision ID: 017_drop_cross_domain_fks
Revises: 016_case_lawyers_m2m
"""

from typing import Sequence, Union

from alembic import op

revision: str = "017_drop_cross_domain_fks"
down_revision: Union[str, None] = "016_case_lawyers_m2m"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, constraint_name, index_column)
# constraint_name следует конвенции Postgres "{table}_{column}_fkey".
_CROSS_DOMAIN_FKS: list[tuple[str, str, str]] = [
    # Legal → IAM
    ("cases", "cases_branch_id_fkey", "branch_id"),
    ("case_lawyers", "case_lawyers_user_id_fkey", "user_id"),
    ("claims", "claims_branch_id_fkey", "branch_id"),
    ("claims", "claims_assigned_lawyer_id_fkey", "assigned_lawyer_id"),
    ("documents", "documents_uploaded_by_fkey", "uploaded_by"),
    ("events", "events_user_id_fkey", "user_id"),
    ("comments", "comments_user_id_fkey", "user_id"),
    # Workspace → IAM / Legal
    ("notifications", "notifications_user_id_fkey", "user_id"),
    ("notifications", "notifications_case_id_fkey", "case_id"),
    ("notification_preferences", "notification_preferences_user_id_fkey", "user_id"),
    # Audit → IAM
    ("audit_logs", "audit_logs_user_id_fkey", "user_id"),
    # System (reports) → IAM
    ("report_requests", "report_requests_user_id_fkey", "user_id"),
]


def upgrade() -> None:
    for table, constraint, column in _CROSS_DOMAIN_FKS:
        op.execute(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}')
        # Индекс может уже существовать (FK обычно создаёт его автоматически), —
        # просто создаём с IF NOT EXISTS, чтобы миграция была идемпотентной.
        idx_name = f"ix_{table}_{column}"
        op.execute(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})')


def downgrade() -> None:
    # Восстанавливать FK после возможных «битых» ссылок небезопасно — в проде
    # за этой миграцией будут денормализация и event-driven sync. Откат вручную.
    pass
