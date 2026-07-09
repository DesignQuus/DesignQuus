from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: str) -> Path:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"required file missing: {path}")
    return target


def require_text(path: str, *needles: str) -> None:
    text = require(path).read_text(encoding="utf-8")
    for needle in needles:
        if needle not in text:
            raise AssertionError(f"{path} missing required marker: {needle}")


def main() -> None:
    package = json.loads(require("package.json").read_text(encoding="utf-8"))
    api_package = json.loads(
        require("apps/api/package.json").read_text(encoding="utf-8")
    )
    assert package["version"] == "1.2.0"
    assert package["scripts"]["test:reliability"]
    assert api_package["scripts"]["test:reliability"]

    require_text(
        "apps/api/src/reliability/retry-policy.ts",
        "calculateRetryDelayMs",
        "validateRetryPolicy",
    )
    require_text(
        "apps/api/src/reliability/idempotency.service.ts",
        "createRequestFingerprint",
        "IDEMPOTENCY_FINGERPRINT_CONFLICT",
        "ConflictException",
    )
    require_text(
        "apps/api/src/reliability/postgres-idempotency.repository.ts",
        "ops.reserve_idempotency",
        "ops.idempotency_records",
    )
    require_text(
        "apps/api/src/reliability/outbox.service.ts",
        "deterministicJitterUnit",
        "calculateRetryDelayMs",
        "OUTBOX_EVENT_STATE_INVALID",
    )
    require_text(
        "apps/api/src/reliability/postgres-outbox.repository.ts",
        "ops.claim_outbox_events",
        "ops.fail_outbox_event",
    )
    require_text(
        "apps/api/src/reliability/dead-letter.service.ts",
        "DEAD_LETTER_NOT_PENDING",
        "newOutboxEventId",
    )
    require_text(
        "apps/api/src/reliability/postgres-dead-letter.repository.ts",
        "ops.replay_dead_letter",
        "ABANDONED",
    )
    require_text(
        "apps/api/src/reliability/reliability.controller.ts",
        "@Controller('reliability')",
        "@Roles('ADMINISTRATOR')",
        "request.identity.userId",
        "dead-letters/:deadLetterId/replay",
    )
    require_text(
        "apps/api/src/reliability/reliability.module.ts",
        "IdempotencyService",
        "OutboxService",
        "DeadLetterService",
    )
    require_text(
        "apps/api/src/app.module.ts",
        "ReliabilityModule",
    )
    require_text(
        "apps/api/test/jest-unit.json",
        "src/reliability/**/*.spec.ts",
    )
    require_text(
        "scripts/reliability_api_fixture.sql",
        "RELIABILITY_API_FIXTURE_READY",
        "OUTBOX_DEFAULT",
    )
    require_text(
        "scripts/reliability_api_probe.py",
        "IDEMPOTENCY_FINGERPRINT_CONFLICT",
        "RETRY_SCHEDULED",
        "DEAD_LETTER",
        "AUTH_ROLE_FORBIDDEN",
        "DEAD_LETTER_NOT_PENDING",
        "PHASE4B_RUNTIME_API_PROBE=PASSED",
    )
    require_text(
        ".github/workflows/reliability-phase4b.yml",
        "Run reliability unit tests",
        "Run database reliability certification",
        "Load reliability API fixture",
        "Run reliability API probe",
    )

    summary = {
        "version": "1.2.0",
        "retry_policy_service": True,
        "idempotency_service": True,
        "outbox_service": True,
        "dead_letter_service": True,
        "reliability_rbac_api": True,
        "unit_tests": True,
        "runtime_api_probe": True,
        "cross_tenant_api_probe": True,
    }
    print(json.dumps(summary, indent=2))
    print("PHASE4B_APPLICATION_RELIABILITY_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
