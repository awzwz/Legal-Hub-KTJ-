from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import user_branch_filter
from app.models import Case, User
from app.services.pir_excel_fill import (
    CATEGORY_ORDER_BY_SHEET,
    DEBT_FIRST_ROW,
    ENFORCEMENT_FIRST_ROW,
    FIRST_DATA_ROW,
    HEADER_LAST_ROW,
    MAIN_MAX_COL,
    SHEET_BY_ROLE,
    TEMPLATE_PATH,
    build_pir_workbook_bytes,
)

__all__ = [
    "build_pir_workbook_bytes",
    "fetch_cases_for_pir_export",
    "generate_pir_xlsx_bytes",
    "TEMPLATE_PATH",
    "FIRST_DATA_ROW",
    "HEADER_LAST_ROW",
    "ENFORCEMENT_FIRST_ROW",
    "DEBT_FIRST_ROW",
    "MAIN_MAX_COL",
    "CATEGORY_ORDER_BY_SHEET",
    "SHEET_BY_ROLE",
]


async def fetch_cases_for_pir_export(
    db: AsyncSession, user: User, date_from: date, date_to: date
) -> list[Case]:
    """Неархивные дела филиала пользователя, поданные в выбранном периоде.

    На основных листах (истец / ответчик / 3-лицо) показываем дела, у которых
    ``filing_date`` попадает в ``[date_from, date_to]``. Если период выбран
    «мимо» — лист реально окажется пустым, это сознательное поведение по
    требованию заказчика.

    Дополнительно тот же ``date_from`` / ``date_to`` ограничивает строки на
    листах исполнительного производства и снижения дебиторки
    (см. ``pir_excel_fill._fill_enforcement_sheet`` / ``_fill_debt_sheet``).
    """
    q = (
        select(Case)
        .where(Case.is_archived.is_(False))
        .where(Case.filing_date >= date_from)
        .where(Case.filing_date <= date_to)
        .options(
            selectinload(Case.finances),
            selectinload(Case.branch),
            selectinload(Case.assigned_lawyer),
            selectinload(Case.litigation),
            selectinload(Case.enforcement_proceedings),
            selectinload(Case.debt_recovery_entries),
        )
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    q = q.order_by(Case.filing_date.desc())
    res = await db.execute(q)
    return list(res.scalars().unique().all())


async def generate_pir_xlsx_bytes(
    db: AsyncSession, user: User, date_from: date, date_to: date
) -> bytes:
    cases = await fetch_cases_for_pir_export(db, user, date_from, date_to)
    # Сборка в том же потоке, что и async-сессия ORM: объекты Case нельзя безопасно передавать в asyncio.to_thread.
    return build_pir_workbook_bytes(cases, date_from, date_to)
