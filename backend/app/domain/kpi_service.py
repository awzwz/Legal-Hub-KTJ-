"""Один источник правды для расчёта KPI юр.службы (формулы согласованы с юристом).

KPI-1 «Доля выигранных исков» (мы — истцы):
    count(plaintiff с outcome ∈ {fully_satisfied, partially_satisfied, settled})
    / count(plaintiff total) × 100%
KPI-2 «Недопущение материального ущерба» (мы — ответчики):
    sum(recovered_main + recovered_fines + recovered_rep_expenses + recovered_state_fee
        для defendant ГДЕ ИСК ПРОТИВ НАС УДОВЛЕТВОРЁН — т.е. outcome ∈ LOST_AS_DEFENDANT)
    / годовая EBITDA × 100%
    Порог — 2%.

    «Денди»-дела (outcome=denied, dismissed, returned для ответчика — мы выиграли)
    не считаются ущербом, даже если по ним прошли остаточные взыскания (судебные
    расходы и т.п.) — их исключаем из суммы.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Branch, Case, CaseFinance, CompanyFinanceSettings


WON_OUTCOMES = ("fully_satisfied", "partially_satisfied", "settled")
# Для ответчика «проиграли» = иск истца против нас был удовлетворён (полностью/частично)
# или урегулирован миром (settled — обычно с выплатой). denied/dismissed/returned — наша победа.
LOST_AS_DEFENDANT = ("fully_satisfied", "partially_satisfied", "settled")


def _kpi1(plaintiff_total: int, plaintiff_won: int) -> float:
    return round((plaintiff_won / plaintiff_total) * 100.0, 2) if plaintiff_total > 0 else 0.0


def _kpi2(lost_sum: Decimal, ebitda: Optional[Decimal]) -> Optional[float]:
    if ebitda is None or ebitda == 0:
        return None
    return round(float(lost_sum) / float(ebitda) * 100.0, 4)


async def get_ebitda(db: AsyncSession, year: int) -> Optional[Decimal]:
    row = (await db.execute(
        select(CompanyFinanceSettings).where(CompanyFinanceSettings.year == year)
    )).scalar_one_or_none()
    return row.ebitda if row else None


async def upsert_ebitda(db: AsyncSession, year: int, ebitda: Decimal) -> CompanyFinanceSettings:
    row = (await db.execute(
        select(CompanyFinanceSettings).where(CompanyFinanceSettings.year == year)
    )).scalar_one_or_none()
    if row is None:
        row = CompanyFinanceSettings(year=year, ebitda=ebitda)
        db.add(row)
    else:
        row.ebitda = ebitda
        row.updated_at = datetime.utcnow()
    await db.flush()
    return row


def _year_filter(year: int):
    return extract("year", Case.filing_date) == year


async def compute_overview(db: AsyncSession, year: int) -> dict:
    """Подсчёт KPI на всю компанию за год."""
    # KPI-1 — по plaintiff делам
    total_p = (await db.execute(
        select(Case).where(and_(Case.party_role == "plaintiff", _year_filter(year)))
    )).scalars().all()
    plaintiff_total = len(total_p)
    plaintiff_won = sum(1 for c in total_p if c.outcome in WON_OUTCOMES)

    # KPI-2 — взысканная сумма по defendant, ТОЛЬКО где иск против нас удовлетворён
    defs = (await db.execute(
        select(CaseFinance, Case)
        .join(Case, CaseFinance.case_id == Case.id)
        .where(and_(
            Case.party_role == "defendant",
            Case.outcome.in_(LOST_AS_DEFENDANT),
            _year_filter(year),
        ))
    )).all()
    lost_sum = Decimal("0")
    for fin, _c in defs:
        lost_sum += (
            (fin.recovered_main or Decimal(0))
            + (fin.recovered_fines or Decimal(0))
            + (fin.recovered_rep_expenses or Decimal(0))
            + (fin.recovered_state_fee or Decimal(0))
        )

    ebitda = await get_ebitda(db, year)
    return {
        "year": year,
        "plaintiff_total": plaintiff_total,
        "plaintiff_won": plaintiff_won,
        "kpi1_percent": _kpi1(plaintiff_total, plaintiff_won),
        "defendant_lost_sum": float(lost_sum),
        "ebitda": float(ebitda) if ebitda is not None else None,
        "kpi2_percent": _kpi2(lost_sum, ebitda),
        "kpi2_threshold": 2.0,
    }


async def compute_per_branch(db: AsyncSession, year: int) -> list[dict]:
    """KPI по каждому филиалу."""
    branches = (await db.execute(select(Branch))).scalars().all()
    ebitda = await get_ebitda(db, year)

    # Соберём все дела за год с финансами одним запросом
    rows = (await db.execute(
        select(Case, CaseFinance)
        .join(CaseFinance, CaseFinance.case_id == Case.id, isouter=True)
        .where(_year_filter(year))
    )).all()

    # Группировка
    by_branch: dict[str, dict] = {}
    for c, fin in rows:
        bid = str(c.branch_id)
        slot = by_branch.setdefault(bid, {
            "plaintiff_total": 0, "plaintiff_won": 0, "defendant_lost_sum": Decimal(0),
        })
        if c.party_role == "plaintiff":
            slot["plaintiff_total"] += 1
            if c.outcome in WON_OUTCOMES:
                slot["plaintiff_won"] += 1
        elif c.party_role == "defendant" and fin is not None and c.outcome in LOST_AS_DEFENDANT:
            slot["defendant_lost_sum"] += (
                (fin.recovered_main or Decimal(0))
                + (fin.recovered_fines or Decimal(0))
                + (fin.recovered_rep_expenses or Decimal(0))
                + (fin.recovered_state_fee or Decimal(0))
            )

    out: list[dict] = []
    for b in branches:
        s = by_branch.get(str(b.id), {"plaintiff_total": 0, "plaintiff_won": 0, "defendant_lost_sum": Decimal(0)})
        out.append({
            "branch_id": str(b.id),
            "branch_name": b.name,
            "plaintiff_total": s["plaintiff_total"],
            "plaintiff_won": s["plaintiff_won"],
            "kpi1_percent": _kpi1(s["plaintiff_total"], s["plaintiff_won"]),
            "defendant_lost_sum": float(s["defendant_lost_sum"]),
            "kpi2_percent": _kpi2(s["defendant_lost_sum"], ebitda),
        })
    # Сортируем филиалы по убыванию KPI-1 — лучший филиал сверху
    out.sort(key=lambda x: (-x["kpi1_percent"], x["branch_name"]))
    return out
