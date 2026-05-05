"""Load `backend/demo/demo_dataset.json` (exported from mockData) when DB has zero cases."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    Branch,
    Case,
    CaseComment,
    CaseEvent,
    CaseFinance,
    Notification,
    Payment,
    User,
)

_NS = uuid.NAMESPACE_URL


def _legacy_case_uuid(legacy_id: str) -> uuid.UUID:
    fixed = {
        "1": uuid.UUID("33333333-3333-3333-3333-333333333301"),
        "2": uuid.UUID("33333333-3333-3333-3333-333333333302"),
        "3": uuid.UUID("33333333-3333-3333-3333-333333333303"),
    }
    return fixed.get(legacy_id, uuid.uuid5(_NS, f"legalhub:demo:case:{legacy_id}"))


def _stable_uuid(kind: str, legacy_id: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"legalhub:demo:{kind}:{legacy_id}")


def _parse_date(s: str) -> date:
    return date.fromisoformat(s[:10])


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s or s == "null":
        return None
    s = s.strip()
    if len(s) <= 10:
        d = date.fromisoformat(s[:10])
        return datetime.combine(d, time(10, 0), tzinfo=timezone.utc)
    if "T" in s:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    if " " in s:
        date_part, time_part = s.split(" ", 1)
        d = date.fromisoformat(date_part)
        parts = time_part.split(":")
        h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        return datetime.combine(d, time(h, m), tzinfo=timezone.utc)
    d = date.fromisoformat(s[:10])
    return datetime.combine(d, time(10, 0), tzinfo=timezone.utc)


def _dataset_path() -> Path:
    return Path(__file__).resolve().parents[2] / "demo" / "demo_dataset.json"


def _try_load_demo_json() -> Optional[dict[str, Any]]:
    path = _dataset_path()
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


async def load_demo_dataset(session: AsyncSession) -> None:
    data = _try_load_demo_json()
    if data is None:
        import logging

        logging.getLogger(__name__).warning(
            "Demo dataset missing at %s — skipping demo import (pilot can use empty DB or import PIR).",
            _dataset_path(),
        )
        return
    cases_raw: list[dict[str, Any]] = data["cases"]
    notifications_raw: list[dict[str, Any]] = data.get("notifications") or []
    audit_raw: list[dict[str, Any]] = data.get("auditLog") or []

    br_rows = (await session.execute(select(Branch))).scalars().all()
    branch_by_name = {b.name: b.id for b in br_rows}

    u_rows = (await session.execute(select(User))).scalars().all()
    user_by_email = {u.email.lower(): u.id for u in u_rows}
    user_by_full_name = {u.full_name: u.id for u in u_rows}

    def resolve_user_id(*, author_name: str) -> Optional[uuid.UUID]:
        if author_name == "Система":
            return None
        if author_name == "Бухгалтер" or author_name.startswith("Бухгалтер"):
            return user_by_email.get("accountant@company.kz")
        if author_name in user_by_full_name:
            return user_by_full_name[author_name]
        if author_name == "Директор":
            return user_by_email.get("director@company.kz")
        return None

    legacy_to_uuid: dict[str, uuid.UUID] = {}

    for row in cases_raw:
        lid = str(row["id"])
        cid = _legacy_case_uuid(lid)
        legacy_to_uuid[lid] = cid
        bid = branch_by_name.get(row["branch"])
        if not bid:
            raise RuntimeError(f"Unknown branch {row['branch']!r} for case {lid}")
        lawyer_name = row["assignedLawyer"]
        lawyer_id = user_by_full_name.get(lawyer_name)
        if not lawyer_id:
            raise RuntimeError(f"Unknown lawyer {lawyer_name!r} for case {lid}")

        nh_raw = row.get("nextHearing")
        nh: Optional[datetime] = None
        if nh_raw not in (None, "not_set"):
            nh = _parse_dt(str(nh_raw))

        pd_raw = row.get("paymentDeadline")
        pd: Optional[date] = _parse_date(pd_raw) if pd_raw else None

        dispute_category = (row.get("disputeCategory") or "procurement").strip().lower()
        if dispute_category not in {"procurement", "transportation", "labor", "other", "mediation"}:
            dispute_category = "procurement"

        opponent_type = str(row.get("opponentType") or "juridical").strip().lower()
        if opponent_type not in {"juridical", "physical"}:
            opponent_type = "juridical"

        c = Case(
            id=cid,
            case_number=row["caseNumber"],
            court=row["court"],
            court_instance=row["courtInstance"],
            case_type=row["caseType"],
            status=row["status"],
            outcome=row["outcome"],
            party_role=row["partyRole"],
            opponent_type=opponent_type,
            plaintiff=row["plaintiff"],
            defendant=row["defendant"],
            company=row["company"],
            company_bin=str(row["companyBIN"])[:12],
            city=row["city"],
            judge=row["judge"],
            filing_date=_parse_date(row["filingDate"]),
            next_hearing=nh,
            payment_deadline=pd,
            last_updated=_parse_date(row["lastUpdated"]),
            days_overdue=int(row.get("daysOverdue") or 0),
            risk_level=row["riskLevel"],
            dispute_category=dispute_category,
            branch_id=bid,
            assigned_lawyer_id=lawyer_id,
        )
        session.add(c)
        session.add(
            CaseFinance(
                case_id=cid,
                claim_amount=Decimal(str(row["claimAmount"])),
                main_debt=Decimal(str(row["mainDebt"])),
                state_fee=Decimal(str(row["stateFee"])),
                fines=Decimal(str(row["fines"])),
                rep_expenses=Decimal(str(row["repExpenses"])),
                other_costs=Decimal(str(row["otherCosts"])),
                paid_amount=Decimal(str(row.get("paidAmount") or 0)),
                recovered_main=Decimal(str(row.get("recoveredMain") or 0)),
                recovered_fines=Decimal(str(row.get("recoveredFines") or 0)),
                recovered_state_fee=Decimal(str(row.get("recoveredStateFee") or 0)),
                recovered_rep_expenses=Decimal(str(row.get("recoveredRepExpenses") or 0)),
            )
        )
        for p in row.get("payments") or []:
            session.add(
                Payment(
                    id=_stable_uuid("payment", str(p["id"])),
                    case_id=cid,
                    document_number=p["documentNumber"],
                    payer=p["payer"],
                    payee=p["payee"],
                    payment_date=_parse_date(p["date"]),
                    amount=Decimal(str(p["amount"])),
                    description=p.get("description") or "",
                )
            )
        for cm in row.get("comments") or []:
            uid = resolve_user_id(author_name=cm["author"])
            session.add(
                CaseComment(
                    id=_stable_uuid("comment", str(cm["id"])),
                    case_id=cid,
                    user_id=uid,
                    author_name=cm["author"],
                    role_label=cm.get("role") or "Юрист",
                    text=cm["text"],
                    comment_type=cm["type"],
                    comment_date=_parse_date(cm["date"]),
                    likes=int(cm.get("likes") or 0),
                )
            )
        for ev in row.get("events") or []:
            uid = resolve_user_id(author_name=ev["user"])
            session.add(
                CaseEvent(
                    id=_stable_uuid("event", str(ev["id"])),
                    case_id=cid,
                    action=ev["action"],
                    user_label=ev["user"],
                    detail=ev.get("detail"),
                    happened_at=_parse_dt(ev["date"]) or datetime.now(timezone.utc),
                    user_id=uid,
                )
            )

    mock_user_to_email = {
        "u1": "director@company.kz",
        "u2": "kasymov@company.kz",
        "u3": "nurlanova@company.kz",
        "u4": "akhmetov@company.kz",
        "u5": "accountant@company.kz",
    }

    for n in notifications_raw:
        case_lid = str(n.get("caseId") or "")
        case_uuid = legacy_to_uuid.get(case_lid)
        case_row = next((x for x in cases_raw if str(x["id"]) == case_lid), None)
        if not case_row:
            continue
        lawyer_name = case_row["assignedLawyer"]
        notify_uid = user_by_full_name.get(lawyer_name) or user_by_email.get("director@company.kz")
        if not notify_uid:
            continue
        created = _parse_dt(n["date"]) or datetime.now(timezone.utc)
        read_at = created if n.get("read") else None
        session.add(
            Notification(
                id=_stable_uuid("notification", str(n["id"])),
                user_id=notify_uid,
                title=n["title"],
                body=n.get("description") or "",
                type=n.get("type") or "info",
                priority=n.get("priority") or "medium",
                read_at=read_at,
                case_id=case_uuid,
                created_at=created,
            )
        )

    for a in audit_raw:
        email = mock_user_to_email.get(str(a.get("userId")))
        uid = user_by_email.get(email) if email else None
        ent = str(a.get("entityType") or "")
        eid = str(a.get("entityId") or "")
        if ent == "case" and eid in legacy_to_uuid:
            eid = str(legacy_to_uuid[eid])
        ts = _parse_dt(a.get("timestamp")) or datetime.now(timezone.utc)
        details = a.get("details") or ""
        if a.get("caseNumber"):
            details = f"{details} [{a.get('caseNumber')}]"
        session.add(
            AuditLog(
                id=_stable_uuid("audit", str(a["id"])),
                user_id=uid,
                action=str(a.get("action") or "view"),
                entity_type=ent,
                entity_id=eid[:64] if eid else None,
                details=details,
                ip=None,
                endpoint=None,
                created_at=ts,
            )
        )


def parse_ui_datetime(s: Optional[str]) -> Optional[datetime]:
    """Parse filing / hearing strings from UI or demo JSON."""
    return _parse_dt(s)


async def seed_demo_if_no_cases(session: AsyncSession) -> None:
    r = await session.execute(select(func.count()).select_from(Case))
    if (r.scalar_one() or 0) > 0:
        return
    await load_demo_dataset(session)
