import asyncio
from sqlalchemy import select
from app.db.session import async_session
from app.models.case import Case
from app.models.case_litigation import CaseLitigation

async def test():
    async with async_session() as session:
        result = await session.execute(
            select(Case.party_role, Case.outcome, CaseLitigation.damage_recovery_note, CaseLitigation.defendant_execution_note, CaseLitigation.execution_proof_note, CaseLitigation.writ_dispatch_note)
            .join(CaseLitigation, Case.id == CaseLitigation.case_id)
            .where(Case.filing_date >= '2025-01-01')
        )
        cases = result.fetchall()
        
        in_work = {"plaintiff": 0, "defendant": 0, "third_party": 0}
        
        for r in cases:
            role, outcome, dmg_note, def_exec, exec_proof, writ_disp = r
            status = "closed"
            if outcome == "pending":
                status = "active"
            else:
                dmg_lower = (dmg_note or "").lower()
                def_lower = (def_exec or "").lower()
                proof_lower = (exec_proof or "").lower()
                disp_lower = (writ_disp or "").lower()
                
                is_closed = False
                if "исполнено" in dmg_lower or "исполнено" in proof_lower:
                    is_closed = True
                elif role == "defendant" and ("пл.пор" in def_lower or "пл. пор" in def_lower or "пл.поручение" in def_lower):
                    is_closed = True
                elif role == "defendant" and def_lower and not ("на исполнении" in dmg_lower):
                    is_closed = True # Most defendant notes are payments
                
                if not is_closed:
                    if "на исполнении" in dmg_lower:
                        status = "execution"
                    elif disp_lower:
                        status = "execution"
                    elif proof_lower and ("возбужден" in proof_lower or "направлен" in proof_lower or "предъявлен" in proof_lower):
                        status = "execution"
            
            if status in ("active", "execution"):
                in_work[role] += 1
                
        print(in_work)

asyncio.run(test())
