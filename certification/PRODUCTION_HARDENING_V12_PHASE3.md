# AI HVAC Engineering OS v1.2 — Production Hardening Phase 3

## Certification status

**PASSED**

Phase 3 established the production security boundary, tenant isolation enforcement, abuse protection, and supply-chain security gates on top of the certified v1.1 runtime and v1.2 Phases 1–2.

## Certified branch

- Branch: `claude/ai-hvac-production-hardening-v1.2-20260709`
- Pull request: `#3`
- Certification commit: `b5531f1a2c6f8f90f8ae928ea05b2807ba88bc82`
- Workflow: `Production Hardening v1.2`
- Workflow run ID: `28985231197`

## Passed source and supply-chain gates

- v1.2 hardening contract validation: `PASSED`
- API production build: `PASSED`
- CycloneDX npm SBOM generation: `PASSED`
- SBOM artifact upload: `PASSED`
- Dependency audit: `PASSED`
- API container build: `PASSED`
- Web container build: `PASSED`
- API image CRITICAL vulnerability gate: `PASSED`
- Web image CRITICAL vulnerability gate: `PASSED`

## Passed authentication and authorization gates

- Trusted gateway authentication boundary: `PASSED`
- Missing authentication rejected with HTTP 401: `PASSED`
- Invalid gateway secret rejected with HTTP 401: `PASSED`
- Valid identity accepted: `PASSED`
- RBAC forbidden operation rejected with HTTP 403: `PASSED`
- Production startup with insecure secret blocked: `PASSED`

## Passed tenant isolation gates

- Non-superuser `app_runtime` role: `PASSED`
- `SET LOCAL ROLE app_runtime`: `PASSED`
- Tenant context through `app.tenant_id`: `PASSED`
- Forced PostgreSQL row-level security: `PASSED`
- Tenant A cannot read Tenant B: `PASSED`
- Tenant B cannot read Tenant A: `PASSED`
- Cross-tenant write blocked: `PASSED`

## Passed abuse protection gates

- Explicit JSON payload limit: `PASSED`
- Stable HTTP 413 response: `PASSED`
- `PAYLOAD_TOO_LARGE` error code: `PASSED`
- Payload error request ID correlation: `PASSED`
- Application rate limiting: `PASSED`
- Stable HTTP 429 response: `PASSED`
- `RATE_LIMIT_EXCEEDED` error code: `PASSED`
- Rate-limit response request ID correlation: `PASSED`

## Phase 3 runtime contract

The platform now provides:

- Trusted gateway identity claims.
- Four explicit roles: `OPERATOR`, `ENGINEER`, `APPROVER`, and `ADMINISTRATOR`.
- Tenant identity resolved only from verified request identity.
- Global authentication and RBAC guards.
- Production startup blocking for weak or missing authentication secrets.
- PostgreSQL execution under a non-superuser runtime role.
- Forced row-level security for tenant-owned tables.
- Automated cross-tenant read and write isolation certification.
- Configurable JSON payload limits.
- Configurable application rate limits.
- Stable 413 and 429 security error envelopes.
- CycloneDX npm SBOM artifacts.
- API and Web container CRITICAL vulnerability gates.

## Runtime defects resolved during certification

1. The first npm SBOM command behaved differently under the GitHub Runner's bundled npm. SBOM generation was made deterministic by pinning npm CLI `11.18.0` and using `--package-lock-only`.
2. The first abuse-policy probe combined payload and rate-limit tests, obscuring the failing boundary. The probes were separated and API state was reset between them.
3. Oversized body-parser errors were not guaranteed to use the platform error contract. A dedicated payload error middleware now returns stable HTTP 413 responses with `PAYLOAD_TOO_LARGE` and request correlation.

Phase 4 continues with reliability and recovery: durable retries, dead-letter replay, idempotency, transactional outbox, and backup/restore certification.
