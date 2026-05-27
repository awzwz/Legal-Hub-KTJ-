"""Контракты доменных событий (shared между сервисами).

Все межсервисные события сериализуются в JSON и публикуются в Redis Streams.
Это единственный «договор» между микросервисами — модели в БД у каждого сервиса
свои, кросс-FK запрещены.

Версионирование: добавляем поле `version`. Несовместимые изменения — новый тип
события (`UserUpdatedV2`), не ломаем существующий контракт.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal, Optional, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class _EventBase(BaseModel):
    """База для всех событий — общие поля, гарантирующие observability."""

    model_config = ConfigDict(populate_by_name=True, frozen=False)

    event_id: UUID = Field(default_factory=uuid4)
    occurred_at: datetime = Field(default_factory=_now)
    version: int = 1


# ──────────────────────────── IAM ────────────────────────────
class UserCreated(_EventBase):
    type: Literal["UserCreated"] = "UserCreated"
    user_id: UUID
    email: str
    full_name: str
    role: str
    branch_id: Optional[UUID] = None


class UserUpdated(_EventBase):
    type: Literal["UserUpdated"] = "UserUpdated"
    user_id: UUID
    full_name: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class UserDeactivated(_EventBase):
    type: Literal["UserDeactivated"] = "UserDeactivated"
    user_id: UUID


# ──────────────────────────── Legal (cases) ────────────────────────────
class CaseCreated(_EventBase):
    type: Literal["CaseCreated"] = "CaseCreated"
    case_id: UUID
    case_number: str
    status: str
    branch_id: UUID
    assigned_lawyer_id: Optional[UUID] = None


class CaseUpdated(_EventBase):
    type: Literal["CaseUpdated"] = "CaseUpdated"
    case_id: UUID
    status: str
    previous_status: Optional[str] = None
    branch_id: UUID
    assigned_lawyer_id: Optional[UUID] = None
    previous_lawyer_id: Optional[UUID] = None
    outcome: Optional[str] = None
    previous_outcome: Optional[str] = None


class CaseAssigned(_EventBase):
    """Назначен новый юрист (выделено из CaseUpdated, потому что workspace
    реагирует на это специальным уведомлением)."""

    type: Literal["CaseAssigned"] = "CaseAssigned"
    case_id: UUID
    case_label: str  # человекочитаемый идентификатор для уведомления
    branch_id: UUID
    assigned_lawyer_id: UUID
    previous_lawyer_id: Optional[UUID] = None


# ──────────────────────────── Workspace (notifications) ────────────────────────────
class NotificationRequested(_EventBase):
    """Сервис-инициатор просит workspace создать уведомление пользователю.

    Workspace применяет к нему preferences и dedup перед записью.
    """

    type: Literal["NotificationRequested"] = "NotificationRequested"
    user_id: UUID
    title: str
    body: str
    notification_type: str
    priority: str = "medium"
    case_id: Optional[UUID] = None
    dedup_key: Optional[str] = None


# Union для discriminated parsing на стороне consumer-а.
DomainEvent = Annotated[
    Union[
        UserCreated,
        UserUpdated,
        UserDeactivated,
        CaseCreated,
        CaseUpdated,
        CaseAssigned,
        NotificationRequested,
    ],
    Field(discriminator="type"),
]


# Маппинг типов → Redis stream key. Хранится здесь, чтобы и publisher,
# и consumer ссылались на один источник правды.
STREAM_KEYS: dict[str, str] = {
    "UserCreated": "legalhub:iam_events",
    "UserUpdated": "legalhub:iam_events",
    "UserDeactivated": "legalhub:iam_events",
    "CaseCreated": "legalhub:case_events",
    "CaseUpdated": "legalhub:case_events",
    "CaseAssigned": "legalhub:case_events",
    "NotificationRequested": "legalhub:notification_requests",
}
