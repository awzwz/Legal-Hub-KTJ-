"""Unit-тесты типизированных контрактов событий."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.contracts.events import (
    STREAM_KEYS,
    CaseAssigned,
    CaseCreated,
    NotificationRequested,
    UserCreated,
)
from app.infra.event_bus import parse_event


def test_every_event_has_a_stream_mapping():
    """Каждый тип события из union обязан быть в STREAM_KEYS — иначе publish упадёт."""
    expected = {
        "UserCreated",
        "UserUpdated",
        "UserDeactivated",
        "CaseCreated",
        "CaseUpdated",
        "CaseAssigned",
        "NotificationRequested",
    }
    missing = expected - STREAM_KEYS.keys()
    assert not missing, f"Missing streams for events: {missing}"


def test_user_created_roundtrip():
    e = UserCreated(
        user_id=uuid4(),
        email="x@y.kz",
        full_name="Иван Иванов",
        role="branch_lawyer",
        branch_id=uuid4(),
    )
    raw = e.model_dump_json()
    parsed = parse_event(raw)
    assert isinstance(parsed, UserCreated)
    assert parsed.user_id == e.user_id
    assert parsed.role == "branch_lawyer"


def test_discriminator_picks_right_subclass():
    e = CaseAssigned(
        case_id=uuid4(),
        case_label="A-123",
        branch_id=uuid4(),
        assigned_lawyer_id=uuid4(),
    )
    parsed = parse_event(e.model_dump_json())
    assert isinstance(parsed, CaseAssigned)
    assert parsed.type == "CaseAssigned"


def test_invalid_event_type_returns_none():
    bad = '{"type": "TotallyUnknown", "event_id": "xxx"}'
    assert parse_event(bad) is None


def test_notification_requested_minimal_payload():
    e = NotificationRequested(
        user_id=uuid4(),
        title="t",
        body="b",
        notification_type="info",
    )
    assert e.priority == "medium"
    assert e.case_id is None
    assert e.dedup_key is None


def test_case_created_requires_branch_id():
    with pytest.raises(Exception):
        # branch_id обязателен
        CaseCreated(  # type: ignore[call-arg]
            case_id=uuid4(),
            case_number="A-1",
            status="filed",
        )
