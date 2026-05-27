from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.case_extensions import (
    CaseLitigationUpsertBody,
    CreateDebtRecoveryBody,
    CreateEnforcementBody,
    PatchDebtRecoveryBody,
    PatchEnforcementBody,
)
from app.schemas.legal_case import (
    CreateCaseDocumentBody,
    CreateCommentBody,
    CreateLegalCaseBody,
    LegalCaseOut,
    PatchCaseBody,
)
from app.domain import case_extension_service, case_service

router = APIRouter(prefix="/cases", tags=["cases"])


def _dump_cases(items: list[LegalCaseOut]) -> list[dict]:
    return [m.model_dump(mode="json", by_alias=True) for m in items]


@router.post("", status_code=201, summary="Create case (+ finances)")
async def create_case(
    body: CreateLegalCaseBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    row = await case_service.create_case(db, user, body)
    return JSONResponse(row.model_dump(mode="json", by_alias=True), status_code=201)


@router.get("", summary="List cases (RBAC + filters)")
async def list_cases(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    status_filter: Optional[str] = Query(default=None, alias="status"),
    branch_id: Optional[UUID] = Query(default=None, alias="branchId"),
    min_claim_amount: Optional[float] = Query(default=None, alias="minClaimAmount"),
):
    rows = await case_service.list_cases_for_user(
        db,
        user,
        status=status_filter,
        branch_id=branch_id,
        min_claim_amount=min_claim_amount,
    )
    return JSONResponse(_dump_cases(rows))


@router.patch("/{case_id}", summary="Partial update case")
async def patch_case(
    case_id: UUID,
    body: PatchCaseBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    row = await case_service.patch_case(db, user, case_id, body)
    return JSONResponse(row.model_dump(mode="json", by_alias=True))


@router.post("/{case_id}/comments", summary="Add comment (+ timeline event)")
async def add_comment(
    case_id: UUID,
    body: CreateCommentBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    row = await case_service.add_case_comment(db, user, case_id, body)
    return JSONResponse(row.model_dump(mode="json", by_alias=True))


@router.post("/{case_id}/documents", status_code=201, summary="Create document record (metadata)")
async def create_case_document(
    case_id: UUID,
    body: CreateCaseDocumentBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = await case_service.add_case_document(
        db, user, case_id, title=body.title, file_name=body.file_name
    )
    return JSONResponse(doc.model_dump(mode="json", by_alias=True), status_code=201)


@router.delete("/{case_id}/documents/{document_id}", status_code=204, summary="Delete document")
async def delete_case_document(
    case_id: UUID,
    document_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await case_service.remove_case_document(db, user, case_id, document_id)
    return Response(status_code=204)


@router.get("/{case_id}", summary="Case detail")
async def get_case(
    case_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    row = await case_service.get_case(db, user, case_id)
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return JSONResponse(row.model_dump(mode="json", by_alias=True))


@router.get("/{case_id}/litigation", summary="Case litigation texts (PIR)")
async def get_case_litigation(
    case_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.get_litigation(db, user, case_id)
    return JSONResponse(out.model_dump(mode="json", by_alias=True))


@router.put("/{case_id}/litigation", summary="Upsert case litigation")
async def put_case_litigation(
    case_id: UUID,
    body: CaseLitigationUpsertBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.upsert_litigation(db, user, case_id, body)
    return JSONResponse(out.model_dump(mode="json", by_alias=True))


@router.get("/{case_id}/enforcement-proceedings", summary="List enforcement rows")
async def list_enforcement(
    case_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    rows = await case_extension_service.list_enforcement(db, user, case_id)
    return JSONResponse([r.model_dump(mode="json", by_alias=True) for r in rows])


@router.post("/{case_id}/enforcement-proceedings", status_code=201, summary="Add enforcement row")
async def create_enforcement(
    case_id: UUID,
    body: CreateEnforcementBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.create_enforcement(db, user, case_id, body)
    return JSONResponse(out.model_dump(mode="json", by_alias=True), status_code=201)


@router.patch("/{case_id}/enforcement-proceedings/{enforcement_id}", summary="Patch enforcement row")
async def patch_enforcement(
    case_id: UUID,
    enforcement_id: UUID,
    body: PatchEnforcementBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.patch_enforcement(db, user, case_id, enforcement_id, body)
    return JSONResponse(out.model_dump(mode="json", by_alias=True))


@router.delete("/{case_id}/enforcement-proceedings/{enforcement_id}", status_code=204, summary="Delete enforcement")
async def delete_enforcement(
    case_id: UUID,
    enforcement_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await case_extension_service.delete_enforcement(db, user, case_id, enforcement_id)
    return Response(status_code=204)


@router.get("/{case_id}/debt-recovery-entries", summary="List debt recovery rows for case")
async def list_debt_recovery(
    case_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    rows = await case_extension_service.list_debt_recovery(db, user, case_id)
    return JSONResponse([r.model_dump(mode="json", by_alias=True) for r in rows])


@router.post("/{case_id}/debt-recovery-entries", status_code=201, summary="Add debt recovery row")
async def create_debt_recovery(
    case_id: UUID,
    body: CreateDebtRecoveryBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.create_debt_recovery(db, user, case_id, body)
    return JSONResponse(out.model_dump(mode="json", by_alias=True), status_code=201)


@router.patch("/{case_id}/debt-recovery-entries/{entry_id}", summary="Patch debt recovery row")
async def patch_debt_recovery(
    case_id: UUID,
    entry_id: UUID,
    body: PatchDebtRecoveryBody,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    out = await case_extension_service.patch_debt_recovery(db, user, case_id, entry_id, body)
    return JSONResponse(out.model_dump(mode="json", by_alias=True))


@router.delete("/{case_id}/debt-recovery-entries/{entry_id}", status_code=204, summary="Delete debt recovery row")
async def delete_debt_recovery(
    case_id: UUID,
    entry_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await case_extension_service.delete_debt_recovery(db, user, case_id, entry_id)
    return Response(status_code=204)
