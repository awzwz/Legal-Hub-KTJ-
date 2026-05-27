import sys
sys.path.insert(0, "/app")
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import Case, CaseLitigation
import asyncio

async def main():
    async with SessionLocal() as db:
        cases = (await db.execute(select(Case, CaseLitigation).join(CaseLitigation).where(Case.party_role == "plaintiff", Case.outcome.in_(["fully_satisfied", "partially_satisfied"])))).all()
        for c, cl in cases:
            j1 = cl.judgment_first.lower() if cl.judgment_first else ""
            if "возврат" in j1 or "возвращ" in j1 or "оставлен" in j1:
                print(f"{c.case_number} -> {cl.judgment_first}")

asyncio.run(main())
