# AI HVAC Engineering OS v1.2 — Production Hardening Phase 1

## Certification status

**PASSED**

Phase 1 established production runtime health, traceability, and deployment probe contracts on top of the fully certified v1.1 source baseline.

## Certified branch

- Branch: `claude/ai-hvac-production-hardening-v1.2-20260709`
- Pull request: `#3`
- Certification commit: `6baf8e30630f9c9cf1953524b54c36459735cd26`
- Workflow: `Production Hardening v1.2`
- Workflow run ID: `28982457108`

## Passed gates

- v1.2 hardening contract validation: `PASSED`
- API production build: `PASSED`
- Dependency audit: `PASSED`
- PostgreSQL startup: `PASSED`
- Database migrations: `PASSED`
- Database smoke test: `PASSED`
- API container startup: `PASSED`
- `/v1/health/ready`: `PASSED`
- `/v1/health/live`: `PASSED`
- `x-request-id` propagation: `PASSED`
- Runtime cleanup: `PASSED`

## Runtime defects resolved

1. Request ID runtime validation originally failed because `curl --dump-header` writes CRLF line endings while the first GNU grep pattern did not match the carriage return reliably.
2. The validation was corrected by stripping `\r`, parsing the response header case-insensitively, and comparing the exact propagated value.

## Phase 1 contract

The API now provides:

- Global request correlation through `x-request-id`.
- Graceful shutdown hooks.
- Process liveness at `/v1/health/live`.
- PostgreSQL-backed readiness at `/v1/health/ready`.
- HTTP 503 when the database dependency is unavailable.
- Runtime version and Git SHA metadata.
- Docker health checks based on readiness rather than a shallow status response.

Phase 2 continues with structured observability, stable error envelopes, and Prometheus-compatible metrics.
