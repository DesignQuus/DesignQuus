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

Status: **IMPLEMENTED — CI verification pending**

- Global `x-request-id` propagation.
- Graceful shutdown hooks.
- `/v1/health/live` process liveness endpoint.
- `/v1/health/ready` database readiness endpoint.
- Readiness timeout and HTTP 503 on dependency failure.
- Runtime version and Git SHA metadata.
- Docker Compose API healthcheck switched from shallow health to readiness.
- v1.2 source/build/runtime probe CI gate.

## Phase 2 — Observability

Planned:

- Structured JSON logs.
- Request duration and response status logging.
- Stable error codes and correlation IDs.
- OpenTelemetry trace contract.
- Prometheus-compatible service metrics.
- Engineering-run metrics for rule, calculation, CAD, and selection pipelines.

## Phase 3 — Security and Tenant Isolation

Planned:

- Authentication boundary and identity claims contract.
- RBAC roles for operator, engineer, approver, and administrator.
- Automated cross-tenant isolation tests.
- Rate limiting and payload-size policies.
- Secret validation with production startup blockers.
- SBOM and container vulnerability gates.

## Phase 4 — Reliability and Recovery

Planned:

- Durable job retry policy.
- Dead-letter and replay workflow.
- Idempotency-key contract for mutating APIs.
- Transactional outbox for cross-service events.
- Object-storage backup and restore drill.
- PostgreSQL backup/restore certification.

## Phase 5 — Performance and Release Certification

Planned:

- API latency budgets.
- Concurrent drawing upload and review load tests.
- Calculation and selection throughput tests.
- Database connection-pool saturation tests.
- Production deployment checklist.
- Rollback drill.
- v1.2 production-readiness certificate.

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
9. Production readiness defects are documented before certification.
10. Certification success never auto-merges the branch.
