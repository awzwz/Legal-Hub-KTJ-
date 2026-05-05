from __future__ import annotations

from typing import Optional

from pydantic import Field

from app.schemas.common import CamelModel


class CaseLitigationOut(CamelModel):
    claim_summary: str = ""
    judgment_first: str = ""
    judgment_appeal: str = ""
    judgment_cassation: str = ""
    damage_recovery_note: str = ""
    writ_request_note: str = ""
    writ_dispatch_note: str = ""
    execution_proof_note: str = ""
    defendant_execution_note: str = ""
    third_party_note: str = ""
    updated_at: Optional[str] = None


class CaseLitigationUpsertBody(CamelModel):
    claim_summary: str = ""
    judgment_first: str = ""
    judgment_appeal: str = ""
    judgment_cassation: str = ""
    damage_recovery_note: str = ""
    writ_request_note: str = ""
    writ_dispatch_note: str = ""
    execution_proof_note: str = ""
    defendant_execution_note: str = ""
    third_party_note: str = ""


class EnforcementProceedingOut(CamelModel):
    id: str
    debtor_name: str
    debtor_bin: Optional[str] = None
    court_act_summary: str = ""
    amount_total: float = 0.0
    amount_main: float = 0.0
    amount_fines: float = 0.0
    amount_fees: float = 0.0
    progress_notes: str = ""
    collected_amount: float = 0.0
    collection_doc_ref: str = ""
    balance_remaining: float = 0.0
    status_label: str = ""
    recorded_at: str


class CreateEnforcementBody(CamelModel):
    debtor_name: str = Field(default="", max_length=512)
    debtor_bin: Optional[str] = Field(default=None, max_length=32)
    court_act_summary: str = ""
    amount_total: float = 0.0
    amount_main: float = 0.0
    amount_fines: float = 0.0
    amount_fees: float = 0.0
    progress_notes: str = ""
    collected_amount: float = 0.0
    collection_doc_ref: str = ""
    balance_remaining: float = 0.0
    status_label: str = ""
    recorded_at: Optional[str] = None


class PatchEnforcementBody(CamelModel):
    debtor_name: Optional[str] = Field(default=None, max_length=512)
    debtor_bin: Optional[str] = Field(default=None, max_length=32)
    court_act_summary: Optional[str] = None
    amount_total: Optional[float] = None
    amount_main: Optional[float] = None
    amount_fines: Optional[float] = None
    amount_fees: Optional[float] = None
    progress_notes: Optional[str] = None
    collected_amount: Optional[float] = None
    collection_doc_ref: Optional[str] = None
    balance_remaining: Optional[float] = None
    status_label: Optional[str] = None
    recorded_at: Optional[str] = None


class DebtRecoveryEntryOut(CamelModel):
    id: str
    case_id: Optional[str] = None
    counterparty_bin: Optional[str] = None
    debtor_name: str = ""
    debtor_status: str = ""
    debt_amount: float = 0.0
    paid_amount: float = 0.0
    written_off_amount: float = 0.0
    work_summary: str = ""
    recorded_at: str


class CreateDebtRecoveryBody(CamelModel):
    counterparty_bin: Optional[str] = Field(default=None, max_length=32)
    debtor_name: str = Field(default="", max_length=512)
    debtor_status: str = Field(default="", max_length=255)
    debt_amount: float = 0.0
    paid_amount: float = 0.0
    written_off_amount: float = 0.0
    work_summary: str = ""
    recorded_at: Optional[str] = None


class PatchDebtRecoveryBody(CamelModel):
    counterparty_bin: Optional[str] = Field(default=None, max_length=32)
    debtor_name: Optional[str] = Field(default=None, max_length=512)
    debtor_status: Optional[str] = Field(default=None, max_length=255)
    debt_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    written_off_amount: Optional[float] = None
    work_summary: Optional[str] = None
    recorded_at: Optional[str] = None
