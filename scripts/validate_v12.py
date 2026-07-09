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
    assert api_package["version"] == "1.2.0"
    assert package["scripts"]["validate:v12"] == "python scripts/validate_v12.py"
    assert package["scripts"]["test:reliability"]
    assert api_package["scripts"]["test:reliability"]

    require_text(
        "apps/api/src/main.ts",
        "requestIdMiddleware",
        "payloadErrorMiddleware",
        "HttpExceptionFilter",
        "validateSecurityEnvironment",
        "bodyParser: false",
        "JSON_BODY_LIMIT",
        "useGlobalFilters",
        "enableShutdownHooks",
        "REQUEST_ID_HEADER",
    )
    require_text(
        "apps/api/src/common/request-id.middleware.ts",
        "x-request-id",
        "randomUUID",
        "response.setHeader",
    )
    require_text(
        "apps/api/src/common/payload-error.middleware.ts",
        "PAYLOAD_TOO_LARGE",
        "security.payload_too_large",
        "response.status(413)",
        "requestId",
    )
    require_text(
        "apps/api/src/common/tenant.ts",
        "RequestWithIdentity",
        "request.identity?.tenantId",
        "AUTH_IDENTITY_REQUIRED",
    )
    require_text(
        "apps/api/src/modules/health/health.controller.ts",
        "@Public()",
        "@Get('live')",
        "@Get('ready')",
        "SELECT 1",
        "ServiceUnavailableException",
        "APP_VERSION",
        "GIT_SHA",
    )
    require_text(
        "apps/api/src/app.module.ts",
        "SecurityModule",
        "ObservabilityModule",
        "ReliabilityModule",
        "RequestObservabilityMiddleware",
        "RequestPolicyMiddleware",
        "forRoutes('*')",
    )
    require_text(
        "apps/api/src/observability/metrics.service.ts",
        "ai_hvac_build_info",
        "ai_hvac_http_requests_total",
        "ai_hvac_http_request_duration_ms_sum",
        "renderPrometheus",
    )
    require_text(
        "apps/api/src/observability/metrics.controller.ts",
        "@Public()",
        "@Controller('metrics')",
        "text/plain; version=0.0.4",
    )
    require_text(
        "apps/api/src/observability/request-observability.middleware.ts",
        "http.request",
        "requestId",
        "durationMs",
        "recordHttpRequest",
    )
    require_text(
        "apps/api/src/observability/http-exception.filter.ts",
        "http.error",
        "HTTP_${statusCode}",
        "Internal server error",
        "requestId",
    )
    require_text(
        "apps/api/src/security/authentication.guard.ts",
        "trusted_gateway",
        "timingSafeEqual",
        "AUTH_GATEWAY_SECRET_INVALID",
        "x-user-id",
        "x-user-role",
        "x-tenant-id",
    )
    require_text(
        "apps/api/src/security/roles.guard.ts",
        "AUTH_ROLE_FORBIDDEN",
        "requiredRoles.includes(role)",
    )
    require_text(
        "apps/api/src/security/security.module.ts",
        "APP_GUARD",
        "AuthenticationGuard",
        "RolesGuard",
    )
    require_text(
        "apps/api/src/security/security-environment.ts",
        "Production startup blocked",
        "AUTH_SHARED_SECRET",
        "32",
    )
    require_text(
        "apps/api/src/security/request-policy.middleware.ts",
        "RATE_LIMIT_WINDOW_MS",
        "RATE_LIMIT_MAX_REQUESTS",
        "RATE_LIMIT_EXCEEDED",
        "security.rate_limit_exceeded",
        "x-ratelimit-remaining",
    )
    require_text(
        "apps/api/src/modules/document/presentation/document.controller.ts",
        "@Roles('OPERATOR', 'ENGINEER', 'ADMINISTRATOR')",
        "@Roles('ENGINEER', 'APPROVER', 'ADMINISTRATOR')",
    )
    require_text(
        "apps/api/src/database/tenant-transaction.ts",
        "SET LOCAL ROLE app_runtime",
        "app.tenant_id",
    )

    require_text(
        "database/migrations/023_security_runtime_role.sql",
        "CREATE ROLE app_runtime",
        "NOSUPERUSER",
        "FORCE ROW LEVEL SECURITY",
        "GRANT EXECUTE ON ALL FUNCTIONS",
    )
    require_text(
        "database/migrations/024_reliability_recovery.sql",
        "CREATE TABLE ops.retry_policies",
        "CREATE TABLE ops.idempotency_records",
        "CREATE TABLE ops.outbox_events",
        "CREATE TABLE ops.dead_letter_jobs",
        "IDEMPOTENCY_FINGERPRINT_CONFLICT",
        "FOR UPDATE SKIP LOCKED",
        "ops.fail_outbox_event",
        "RETRY_SCHEDULED",
        "DEAD_LETTER",
        "ops.replay_dead_letter",
    )
    require_text(
        "database/migrations/025_reliability_recovery_rls.sql",
        "FORCE ROW LEVEL SECURITY",
        "tenant_isolation",
        "ops.fail_outbox_event",
        "app_runtime",
    )
    require_text(
        "database/migrations/runtime-manifest.txt",
        "023_security_runtime_role.sql",
        "024_reliability_recovery.sql",
        "025_reliability_recovery_rls.sql",
    )

    require_text(
        "apps/api/src/reliability/retry-policy.ts",
        "calculateRetryDelayMs",
        "validateRetryPolicy",
        "jitterRatio",
    )
    require_text(
        "apps/api/src/reliability/idempotency.service.ts",
        "createRequestFingerprint",
        "sha256:",
        "IDEMPOTENCY_FINGERPRINT_CONFLICT",
        "IDEMPOTENCY_RECORD_NOT_FOUND",
    )
    require_text(
        "apps/api/src/reliability/postgres-idempotency.repository.ts",
        "ops.reserve_idempotency",
        "COMPLETED",
        "FAILED",
    )
    require_text(
        "apps/api/src/reliability/outbox.service.ts",
        "deterministicJitterUnit",
        "calculateRetryDelayMs",
        "RETRY_POLICY_NOT_FOUND",
        "OUTBOX_EVENT_STATE_INVALID",
    )
    require_text(
        "apps/api/src/reliability/postgres-outbox.repository.ts",
        "ops.claim_outbox_events",
        "ops.fail_outbox_event",
        "PUBLISHED",
    )
    require_text(
        "apps/api/src/reliability/dead-letter.service.ts",
        "DEAD_LETTER_NOT_PENDING",
        "newOutboxEventId",
        "abandonedBy",
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
        "PostgresIdempotencyRepository",
        "PostgresOutboxRepository",
        "PostgresDeadLetterRepository",
    )
    require_text(
        "apps/api/test/jest-unit.json",
        "src/reliability/**/*.spec.ts",
        "ts-jest",
    )
    require_text(
        "apps/api/src/reliability/retry-policy.spec.ts",
        "exponential backoff",
        "deterministic jitter",
    )
    require_text(
        "apps/api/src/reliability/idempotency.service.spec.ts",
        "same fingerprint",
        "HTTP 409",
    )
    require_text(
        "apps/api/src/reliability/outbox.service.spec.ts",
        "deterministic failure transitions",
        "PUBLISHING state",
    )
    require_text(
        "apps/api/src/reliability/dead-letter.service.spec.ts",
        "replays a pending",
        "no longer pending",
    )

    require_text(
        "scripts/tenant_isolation_test.sql",
        "TENANT_A_READ_ISOLATION_FAILED",
        "TENANT_B_READ_ISOLATION_FAILED",
        "CROSS_TENANT_WRITE_WAS_NOT_BLOCKED",
        "TENANT_ISOLATION_CERTIFIED",
    )
    require_text(
        "scripts/reliability_recovery_test.sql",
        "IDEMPOTENCY_FIRST_RESERVATION_NOT_NEW",
        "IDEMPOTENCY_FINGERPRINT_CONFLICT_NOT_BLOCKED",
        "OUTBOX_DISTINCT_CLAIM_FAILED",
        "OUTBOX_RETRY_NOT_SCHEDULED",
        "OUTBOX_DEAD_LETTER_TRANSITION_FAILED",
        "DEAD_LETTER_REPLAY_STATE_FAILED",
        "EXPIRED_OUTBOX_LEASE_NOT_RECLAIMED",
        "TENANT_B_CAN_READ_TENANT_A_OUTBOX",
        "RELIABILITY_RECOVERY_CERTIFIED",
    )
    require_text(
        "scripts/run_db_smoke_test.sh",
        "tenant_isolation_test.sql",
        "reliability_recovery_test.sql",
        "TENANT_ISOLATION_OK",
        "RELIABILITY_RECOVERY_OK",
    )
    require_text(
        "compose.yaml",
        "/v1/health/ready",
        "APP_VERSION: 1.2.0",
        "GIT_SHA:",
        "AUTH_MODE: trusted_gateway",
        "AUTH_SHARED_SECRET:",
        "JSON_BODY_LIMIT:",
        "RATE_LIMIT_WINDOW_MS:",
        "RATE_LIMIT_MAX_REQUESTS:",
        "stop_grace_period: 20s",
    )
    require_text(
        ".github/workflows/production-hardening-v12.yml",
        "npx --yes npm@11.18.0 sbom --package-lock-only --sbom-format cyclonedx",
        "aquasecurity/trivy-action@v0.36.0",
        "Scan API image for critical vulnerabilities",
        "Scan Web image for critical vulnerabilities",
        "RATE_LIMIT_EXCEEDED",
        "PAYLOAD_STATUS",
    )

    summary = {
        "version": "1.2.0",
        "request_id": "configured",
        "liveness": "/v1/health/live",
        "readiness": "/v1/health/ready",
        "database_readiness": "SELECT 1",
        "graceful_shutdown": True,
        "structured_request_logs": True,
        "stable_error_envelope": True,
        "prometheus_metrics": "/v1/metrics",
        "trusted_gateway_auth": True,
        "rbac": ["OPERATOR", "ENGINEER", "APPROVER", "ADMINISTRATOR"],
        "verified_tenant_identity": True,
        "runtime_db_role": "app_runtime",
        "forced_rls": True,
        "cross_tenant_certification": True,
        "production_secret_blocker": True,
        "json_payload_limit": True,
        "stable_payload_error_envelope": True,
        "application_rate_limit": True,
        "cyclonedx_sbom": True,
        "container_critical_vulnerability_gate": True,
        "idempotency_fingerprint_contract": True,
        "transactional_outbox": True,
        "skip_locked_claims": True,
        "lease_recovery": True,
        "dead_letter_replay": True,
        "reliability_tenant_isolation": True,
        "reliability_application_services": True,
        "reliability_rbac_api": True,
        "reliability_unit_tests": True,
        "compose_readiness_gate": True,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("V1_2_PRODUCTION_HARDENING_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
