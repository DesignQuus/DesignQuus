# AI HVAC Engineering OS v1.2 — Production Hardening Roadmap

## Goal

Move the v1.1 full-source certified engineering platform from functional runtime certification to production-readiness certification.

The v1.2 program does not change the core engineering ownership model:

- AI reads and understands.
- Rule Engine applies versioned rules.
- Calculation Engine performs deterministic engineering calculations.
- Simulation and geometry engines verify independently.
- Expert approval remains the final authority.

## Phase 1 — Runtime Health and Traceability

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE1.md`

- Global `x-request-id` propagation.
- Graceful shutdown hooks.
- `/v1/health/live` process liveness endpoint.
- `/v1/health/ready` database readiness endpoint.
- Readiness timeout and HTTP 503 on dependency failure.
- Runtime version and Git SHA metadata.
- Docker Compose API healthcheck switched from shallow health to readiness.
- v1.2 source/build/runtime probe CI gate.

## Phase 2 — Structured Observability

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE2.md`

- Structured JSON request logs.
- Request duration and response status logging.
- Stable error codes and correlation IDs.
- Stable HTTP error response envelope.
- Server error message masking.
- Prometheus-compatible service metrics at `/v1/metrics`.
- Build metadata and process uptime metrics.
- HTTP request count and duration-sum metrics.

Advanced observability extensions remain available for later hardening:

- OpenTelemetry distributed trace export.
- Engineering-run metrics for rule, calculation, CAD, and selection pipelines.
- External Prometheus/Grafana deployment profiles.

## Phase 3 — Security and Tenant Isolation

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE3.md`

- Trusted gateway authentication and verified identity claims.
- RBAC roles for `OPERATOR`, `ENGINEER`, `APPROVER`, and `ADMINISTRATOR`.
- Tenant identity resolved only from verified request identity.
- Non-superuser PostgreSQL `app_runtime` role.
- `SET LOCAL ROLE app_runtime` for tenant transactions.
- Forced row-level security for tenant-owned tables.
- Automated cross-tenant read and write isolation certification.
- Production secret validation and insecure-startup blockers.
- Explicit JSON payload-size policy and stable HTTP 413 envelope.
- Application rate limiting and stable HTTP 429 envelope.
- CycloneDX npm SBOM artifact generation.
- API and Web container CRITICAL vulnerability gates.

## Phase 4 — Reliability and Recovery

Status: **PASSED**

### Phase 4A — Database Reliability Core

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE4A.md`

- Versioned retry policies.
- Tenant-scoped idempotency records.
- Transactional outbox tables and functions.
- `FOR UPDATE SKIP LOCKED` worker claims.
- Retry scheduling and maximum-attempt dead-letter transition.
- Expired publishing-lease recovery.
- Dead-letter storage and replay.
- Forced RLS for reliability tables.
- PostgreSQL reliability certification tests.

### Phase 4B — Application Reliability Services

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE4B.md`

- Deterministic retry-delay calculator.
- Canonical JSON SHA-256 request fingerprints.
- Idempotency reserve, reuse, complete, fail, and lookup service.
- Outbox enqueue, claim, publish, and failure-transition service.
- Dead-letter list, replay, and abandon service.
- RBAC-protected `/v1/reliability/*` APIs.
- Verified identity actor attribution.
- Reliability unit-test suite.
- End-to-end HTTP reliability API certification.
- Cross-tenant API isolation probes.

### Phase 4C — Backup and Restore Recovery Certification

Status: **PASSED**

Certification: `certification/PRODUCTION_HARDENING_V12_PHASE4C.md`

- PostgreSQL custom-format logical backup.
- SHA-256 backup checksum and metadata manifest.
- Source-state mutation after backup.
- Source PostgreSQL volume destruction.
- `template0` clean target database recreation.
- Pre-restore PostGIS absence verification.
- Exact `pg_restore --exit-on-error` recovery.
- Pre-backup versus post-restore row-count verification.
- Deterministic content checksum verification.
- PostGIS geometry recovery probe.
- Object-storage backup manifest and restore drill.
- Recovery artifacts and certification record.

## Phase 5 — Performance and Release Certification

Status: **IN PROGRESS**

### Phase 5A — Performance Baselines

Initial scope:

- API latency budgets and percentile reporting.
- Health/readiness concurrency baseline.
- Authenticated reliability read/write baseline.
- Concurrent drawing upload and review load tests.
- Calculation and selection throughput tests.
- Database connection-pool saturation tests.
- Performance artifact generation.

### Phase 5B — Deployment and Rollback

Planned:

- Production deployment checklist.
- Version/build metadata verification.
- Migration-forward deployment drill.
- Deliberate release failure injection.
- Rollback drill.
- Post-rollback health and data-integrity verification.

### Phase 5C — Final Release Certification

Planned:

- All prior phase certification aggregation.
- Open defect gate.
- Release manifest.
- v1.2 production-readiness certificate.
- Final PR readiness review.

## v1.2 Release Gates

A v1.2 release candidate must satisfy all of the following:

1. v1.1 full-source certification remains green.
2. v1.2 hardening validator passes.
3. API production build passes.
4. Dependency audit reports zero accepted vulnerabilities above policy threshold.
5. Database migrations and DB smoke tests pass.
6. `/health/live` returns HTTP 200.
7. `/health/ready` returns HTTP 200 only when PostgreSQL is reachable.
8. Request ID propagation is verified end to end.
9. Structured metrics and stable error envelopes are runtime verified.
10. Cross-tenant isolation and RBAC gates pass.
11. Payload, rate-limit, SBOM, and container vulnerability gates pass.
12. Phase 4A database reliability certification passes.
13. Phase 4B application reliability certification passes.
14. Phase 4C backup and restore recovery certification passes.
15. Phase 5 performance budgets pass.
16. Deployment and rollback drill passes.
17. Final production-readiness certificate is generated.
18. Production readiness defects are documented before certification.
19. Certification success never auto-merges the branch.
