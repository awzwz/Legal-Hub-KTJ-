from __future__ import annotations

from datetime import date

from pydantic import Field

from app.schemas.common import CamelModel


class ReportRequestCreate(CamelModel):
    report_type: str = Field(max_length=64, validation_alias="reportType")
    date_from: date = Field(validation_alias="dateFrom")
    date_to: date = Field(validation_alias="dateTo")


class ReportRequestOut(CamelModel):
    id: str
    status: str
    report_type: str = Field(serialization_alias="reportType")
    date_from: str = Field(serialization_alias="dateFrom")
    date_to: str = Field(serialization_alias="dateTo")
