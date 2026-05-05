from __future__ import annotations

import asyncio
import logging
from datetime import date
from functools import partial
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.report import ReportRequestCreate, ReportRequestOut
from app.services import audit_write, pir_excel_export, report_service
from app.services import report_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/requests", status_code=201, summary="Create report request row")
async def create_report_request(
    body: ReportRequestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    row = await report_service.create_report_request(
        db, user, report_type=body.report_type, date_from=body.date_from, date_to=body.date_to
    )
    await audit_write.write_audit_log(
        db,
        user,
        action="export",
        entity_type="report",
        entity_id=str(row.id),
        details=f"Заявка на отчёт {body.report_type}",
    )
    await db.commit()
    out = ReportRequestOut(
        id=str(row.id),
        status=row.status,
        report_type=row.report_type,
        date_from=row.date_from.isoformat(),
        date_to=row.date_to.isoformat(),
    )
    return JSONResponse(out.model_dump(mode="json", by_alias=True), status_code=201)


@router.get("/pir.xlsx", summary="Download PIR Excel (KTZH template)")
async def download_pir_xlsx(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    date_from: date = Query(alias="dateFrom"),
    date_to: date = Query(alias="dateTo"),
):
    if date_from > date_to:
        raise HTTPException(status_code=400, detail="dateFrom must be <= dateTo")
    try:
        data = await pir_excel_export.generate_pir_xlsx_bytes(db, user, date_from, date_to)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    await audit_write.write_audit_log(
        db,
        user,
        action="export",
        entity_type="report",
        entity_id="pir",
        details=f"Выгрузка ПИР Excel за {date_from.isoformat()}–{date_to.isoformat()}",
    )
    await db.commit()

    filename = f"PIR_{date_from.isoformat()}_{date_to.isoformat()}.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    # Зеркало в S3 — необязательно; при ошибке сети/таймауте пользователь всё равно получает файл в теле ответа.
    if report_storage.s3_configured():
        sk = f"exports/pir/{date_from.isoformat()}_{date_to.isoformat()}.xlsx"
        upload_callable = partial(
            report_storage.upload_bytes,
            key=sk,
            body=data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        try:
            uri = await asyncio.wait_for(asyncio.to_thread(upload_callable), timeout=45.0)
            if uri:
                headers["X-Export-Storage"] = uri
        except (TimeoutError, asyncio.TimeoutError, OSError) as e:
            logger.warning("PIR S3 mirror skipped: %s", e)
        except Exception as e:
            logger.warning("PIR S3 mirror failed (non-fatal): %s", e)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
