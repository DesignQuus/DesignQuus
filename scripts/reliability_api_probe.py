from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3001/v1").rstrip("/")
AUTH_SHARED_SECRET = os.environ["AUTH_SHARED_SECRET"]
TENANT_A = "60000000-0000-7000-8000-000000000000"
TENANT_B = "70000000-0000-7000-8000-000000000000"


def request(
    method: str,
    path: str,
    *,
    role: str = "ENGINEER",
    tenant_id: str = TENANT_A,
    user_id: str = "phase4b-engineer",
    body: Any = None,
) -> tuple[int, Any]:
    data = None
    if body is not None:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
    elif method.upper() in {"POST", "PUT", "PATCH"}:
        data = b""

    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method.upper(),
        headers={
            "content-type": "application/json",
            "x-auth-secret": AUTH_SHARED_SECRET,
            "x-user-id": user_id,
            "x-user-role": role,
            "x-tenant-id": tenant_id,
            "x-request-id": f"phase4b-{user_id}-{time.time_ns()}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def expect_status(
    actual_status: int,
    expected_status: int,
    payload: Any,
    label: str,
) -> None:
    if actual_status != expected_status:
        raise AssertionError(
            f"{label}: expected HTTP {expected_status}, got {actual_status}: {payload!r}"
        )


def main() -> None:
    reservation_body = {
        "scope": "PHASE4B_API",
        "idempotencyKey": "idem-api-001",
        "requestPayload": {"b": 2, "a": 1},
        "ttlSeconds": 3600,
    }

    status, payload = request(
        "POST",
        "/reliability/idempotency/reservations",
        role="OPERATOR",
        user_id="phase4b-operator",
        body=reservation_body,
    )
    expect_status(status, 403, payload, "idempotency RBAC")
    assert payload["errorCode"] == "AUTH_ROLE_FORBIDDEN"

    status, first = request(
        "POST",
        "/reliability/idempotency/reservations",
        body=reservation_body,
    )
    expect_status(status, 201, first, "first idempotency reservation")
    assert first["isNew"] is True
    assert first["requestFingerprint"].startswith("sha256:")
    record_id = first["recordId"]

    status, second = request(
        "POST",
        "/reliability/idempotency/reservations",
        body={
            **reservation_body,
            "requestPayload": {"a": 1, "b": 2},
        },
    )
    expect_status(status, 201, second, "idempotency replay")
    assert second["isNew"] is False
    assert second["recordId"] == record_id
    assert second["requestFingerprint"] == first["requestFingerprint"]

    status, conflict = request(
        "POST",
        "/reliability/idempotency/reservations",
        body={
            **reservation_body,
            "requestPayload": {"a": 1, "b": 999},
        },
    )
    expect_status(status, 409, conflict, "idempotency fingerprint conflict")
    assert conflict["errorCode"] == "IDEMPOTENCY_FINGERPRINT_CONFLICT"

    status, completed = request(
        "POST",
        f"/reliability/idempotency/{record_id}/complete",
        body={"responseStatus": 202, "responseBody": {"accepted": True}},
    )
    expect_status(status, 201, completed, "idempotency completion")
    assert completed["state"] == "COMPLETED"
    assert completed["responseStatus"] == 202

    scope = urllib.parse.quote("PHASE4B_API", safe="")
    key = urllib.parse.quote("idem-api-001", safe="")
    status, stored = request(
        "GET",
        f"/reliability/idempotency/{scope}/{key}",
        role="APPROVER",
        user_id="phase4b-approver",
    )
    expect_status(status, 200, stored, "idempotency lookup")
    assert stored["state"] == "COMPLETED"

    status, event = request(
        "POST",
        "/reliability/outbox/events",
        body={
            "aggregateType": "PROJECT",
            "aggregateId": "60000000-0000-7000-8000-000000000101",
            "eventType": "PROJECT.UPDATED",
            "payload": {"sequence": 1},
            "retryPolicyKey": "OUTBOX_DEFAULT",
        },
    )
    expect_status(status, 201, event, "outbox enqueue")
    assert event["state"] == "PENDING"
    event_id = event["id"]

    status, hidden = request(
        "GET",
        f"/reliability/outbox/{event_id}",
        tenant_id=TENANT_B,
        user_id="phase4b-tenant-b-engineer",
    )
    expect_status(status, 404, hidden, "cross-tenant outbox isolation")
    assert hidden["errorCode"] == "OUTBOX_EVENT_NOT_FOUND"

    status, claimed = request(
        "POST",
        "/reliability/outbox/claim",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
        body={"workerId": "phase4b-worker-1", "limit": 1, "leaseSeconds": 60},
    )
    expect_status(status, 201, claimed, "first outbox claim")
    assert len(claimed) == 1
    assert claimed[0]["id"] == event_id
    assert claimed[0]["state"] == "PUBLISHING"
    assert claimed[0]["attemptCount"] == 1

    status, first_failure = request(
        "POST",
        f"/reliability/outbox/{event_id}/fail",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
        body={"failureReason": "transient publisher failure"},
    )
    expect_status(status, 201, first_failure, "first outbox failure")
    assert first_failure["transition"] == "RETRY_SCHEDULED"

    time.sleep(0.05)
    status, reclaimed = request(
        "POST",
        "/reliability/outbox/claim",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
        body={"workerId": "phase4b-worker-2", "limit": 1, "leaseSeconds": 60},
    )
    expect_status(status, 201, reclaimed, "second outbox claim")
    assert len(reclaimed) == 1
    assert reclaimed[0]["id"] == event_id
    assert reclaimed[0]["attemptCount"] == 2

    status, terminal_failure = request(
        "POST",
        f"/reliability/outbox/{event_id}/fail",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
        body={"failureReason": "terminal publisher failure"},
    )
    expect_status(status, 201, terminal_failure, "terminal outbox failure")
    assert terminal_failure["transition"] == "DEAD_LETTER"

    status, dead_letters = request(
        "GET",
        "/reliability/dead-letters?limit=20",
        role="APPROVER",
        user_id="phase4b-approver",
    )
    expect_status(status, 200, dead_letters, "dead-letter listing")
    matching = [item for item in dead_letters if item["sourceJobId"] == event_id]
    assert len(matching) == 1
    dead_letter_id = matching[0]["id"]

    status, forbidden_replay = request(
        "POST",
        f"/reliability/dead-letters/{dead_letter_id}/replay",
        role="APPROVER",
        user_id="phase4b-approver",
    )
    expect_status(status, 403, forbidden_replay, "dead-letter replay RBAC")
    assert forbidden_replay["errorCode"] == "AUTH_ROLE_FORBIDDEN"

    status, replayed = request(
        "POST",
        f"/reliability/dead-letters/{dead_letter_id}/replay",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
    )
    expect_status(status, 201, replayed, "dead-letter replay")
    assert replayed["deadLetterId"] == dead_letter_id
    assert replayed["newOutboxEventId"]
    assert replayed["replayedBy"] == "phase4b-admin"

    status, duplicate_replay = request(
        "POST",
        f"/reliability/dead-letters/{dead_letter_id}/replay",
        role="ADMINISTRATOR",
        user_id="phase4b-admin",
    )
    expect_status(status, 409, duplicate_replay, "duplicate dead-letter replay")
    assert duplicate_replay["errorCode"] == "DEAD_LETTER_NOT_PENDING"

    status, tenant_b_dead_letters = request(
        "GET",
        "/reliability/dead-letters?limit=20",
        role="APPROVER",
        tenant_id=TENANT_B,
        user_id="phase4b-tenant-b-approver",
    )
    expect_status(status, 200, tenant_b_dead_letters, "cross-tenant dead-letter isolation")
    assert tenant_b_dead_letters == []

    summary = {
        "idempotency_first_reservation": "PASSED",
        "idempotency_reuse": "PASSED",
        "idempotency_conflict": "PASSED",
        "idempotency_completion": "PASSED",
        "outbox_retry": "PASSED",
        "outbox_dead_letter": "PASSED",
        "dead_letter_rbac": "PASSED",
        "dead_letter_replay": "PASSED",
        "duplicate_replay_blocked": "PASSED",
        "cross_tenant_api_isolation": "PASSED",
    }
    print(json.dumps(summary, indent=2))
    print("PHASE4B_RUNTIME_API_PROBE=PASSED")


if __name__ == "__main__":
    main()
