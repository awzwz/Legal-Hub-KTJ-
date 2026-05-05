"""Add PIR-aligned fields: dispute category, recovered rep_expenses, defendant execution note, third-party note.

Revision ID: 012_pir_categories_fields (must fit alembic_version.version_num VARCHAR(32))
Revises: 011_drop_lawyer_fk

Шаблон ПИР делит дела внутри листов «истец» и «ответчик» на разделы:
  - procurement     (Иски о закупках/договорах)
  - transportation  (Иски, вытекающие из перевозочного процесса)  — только на «ответчик»
  - labor           (Трудовые споры)
  - other           (Иные споры)
  - mediation       (Медиативные соглашения)

Также шаблон требует разделения «взысканной суммы» на 4 части (основная / штрафы /
представительские / госпошлина) на листах «ответчик» и «3-лицо», и отдельные текстовые
поля: «информация об исполнении» (col 18 на «ответчик») и «примечание» (col 19 на «3-лицо»).

Дефолт ``dispute_category='procurement'`` — основная категория шаблона; юрист
переключит вручную для трудовых/перевозочных/иных/медиативных.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_pir_categories_fields"
down_revision: Union[str, None] = "011_drop_lawyer_fk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cases",
        sa.Column(
            "dispute_category",
            sa.String(length=32),
            nullable=False,
            server_default="procurement",
        ),
    )
    op.add_column(
        "case_finances",
        sa.Column(
            "recovered_rep_expenses",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "case_litigation",
        sa.Column(
            "defendant_execution_note",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "case_litigation",
        sa.Column(
            "third_party_note",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )

    # Эвристика для уже импортированных дел: трудовые/мед./иные распределяем по case_type,
    # чтобы экспорт сразу попадал в нужный раздел шаблона. Закупки/договоры остаются дефолтом.
    op.execute(
        sa.text(
            """
            UPDATE cases SET dispute_category = CASE
                WHEN case_type = 'labor' THEN 'labor'
                WHEN case_type IN ('criminal', 'tax', 'administrative') THEN 'other'
                WHEN status = 'mediation' OR outcome = 'settled' THEN 'mediation'
                ELSE 'procurement'
            END
            WHERE is_archived = false
            """
        )
    )


def downgrade() -> None:
    op.drop_column("case_litigation", "third_party_note")
    op.drop_column("case_litigation", "defendant_execution_note")
    op.drop_column("case_finances", "recovered_rep_expenses")
    op.drop_column("cases", "dispute_category")
