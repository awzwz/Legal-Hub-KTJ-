from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.services.payment_sync import sync_payment_from_1c


class InternalPaymentBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_number: str
    payer_bin: str
    payee_bin: str
    amount: float = Field(ge=0)
    payment_date: str
    description: str = ""


def require_internal_key(x_internal_key: Annotated[Optional[str], Header(alias="X-Internal-Key")] = None):
    expected = get_settings().internal_api_key
    if not x_internal_key or x_internal_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


router = APIRouter(prefix="/payments", tags=["internal-payments"])


@router.post("/sync", summary="1C-style payment push (idempotent); dedupe по document_number+payer_bin")
async def sync_payment(
    body: InternalPaymentBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_internal_key)],
):
    from datetime import datetime
    from decimal import Decimal

    try:
        raw = body.payment_date.replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
    except ValueError:
        raise HTTPException(400, detail="Invalid payment_date")

    ok, msg, case_id = await sync_payment_from_1c(
        db,
        document_number=body.document_number,
        payer_bin=body.payer_bin,
        payee_bin=body.payee_bin,
        amount=Decimal(str(body.amount)),
        payment_date=dt,
        description=body.description,
    )
    if not ok:
        raise HTTPException(404, detail=msg or "sync_failed")
    if msg == "duplicate_ignored":
        return {"synced": True, "duplicate": True, "case_id": str(case_id) if case_id else None}
    return {"synced": True, "duplicate": False, "case_id": str(case_id) if case_id else None}
