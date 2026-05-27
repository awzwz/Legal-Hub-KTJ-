from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import user_branch_filter
from app.models import Case, CaseFinance, User
from app.domain import redis_cache


async def get_dashboard_stats(db: AsyncSession, user: User) -> dict:
    suffix = f"{user.id}:{user.role}"
    key = redis_cache.dashboard_stats_cache_key(str(user.id), suffix)
    cached = await redis_cache.cache_get_json(key)
    if cached is not None:
        return cached

    q = (
        select(func.count(Case.id), func.coalesce(func.sum(CaseFinance.claim_amount), 0))
        .join(CaseFinance, CaseFinance.case_id == Case.id)
        .where(Case.is_archived.is_(False))
    )
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    res = await db.execute(q)
    row = res.one()
    count, total_claim = int(row[0]), float(row[1] or 0)

    payload = {
        "caseCount": count,
        "totalClaimAmount": total_claim,
    }
    await redis_cache.cache_set_json(key, payload, ttl_seconds=60)
    return payload


async def get_dashboard_charts(db: AsyncSession, user: User) -> dict:
    suffix = f"{user.id}:{user.role}"
    key = redis_cache.dashboard_charts_cache_key(str(user.id), suffix)
    cached = await redis_cache.cache_get_json(key)
    if cached is not None:
        return cached

    q = select(Case.status, func.count(Case.id)).where(Case.is_archived.is_(False))
    bf = user_branch_filter(user)
    if bf is not None:
        q = q.where(Case.branch_id == bf)
    q = q.group_by(Case.status)
    res = await db.execute(q)
    by_status = [{"status": s, "count": c} for s, c in res.all()]

    q2 = select(Case.branch_id, func.count(Case.id)).where(Case.is_archived.is_(False))
    if bf is not None:
        q2 = q2.where(Case.branch_id == bf)
    q2 = q2.group_by(Case.branch_id)
    res2 = await db.execute(q2)
    by_branch = [{"branchId": str(bid), "count": c} for bid, c in res2.all()]

    payload = {"byStatus": by_status, "byBranch": by_branch}
    await redis_cache.cache_set_json(key, payload, ttl_seconds=60)
    return payload
