# AI HVAC Engineering OS v1.2 — Production Hardening Phase 4A

## Certification status

**PASSED**

Phase 4A established the database reliability core for deterministic idempotency, transactional outbox processing, retry transitions, dead-letter handling, lease recovery, and tenant-isolated replay operations.

## Certified branch

- Branch: `claude/ai-hvac-production-hardening-v1.2-20260709`
- Pull request: `#3`
- Certification commit: `08b76d2970b272a1565c4bdf74a5e79b17c8217f`
- Production Hardening workflow run ID: `28985937952`
- Full Runtime Certification run ID: `28985937984`
- Bootstrap Certification run ID: `28985937956`

## Passed reliability gates

- Migration `024_reliability_recovery.sql`: `PASSED`
- Migration `025_reliability_recovery_rls.sql`: `PASSED`
- Idempotency first reservation: `PASSED`
- Idempotency same-fingerprint reuse: `PASSED`
- Same key with different fingerprint blocked: `PASSED`
- Distinct outbox worker claims: `PASSED`
- Retry scheduling transition: `PASSED`
- Maximum-attempt dead-letter transition: `PASSED`
- Dead-letter record creation: `PASSED`
- Dead-letter replay: `PASSED`
- Expired outbox lease recovery: `PASSED`
- Reliability-table tenant isolation: `PASSED`

## Passed regression gates

- v1.2 source/build validator: `PASSED`
- API production build: `PASSED`
- CycloneDX SBOM: `PASSED`
- Dependency audit: `PASSED`
- API/Web CRITICAL vulnerability gates: `PASSED`
- Health and readiness probes: `PASSED`
- Structured observability: `PASSED`
- Authentication and RBAC: `PASSED`
- Payload and rate-limit policies: `PASSED`
- Full calculation/CAD regression: `PASSED`
- Docker/PostGIS Runtime Certification: `PASSED`
- Bootstrap Runtime Certification: `PASSED`

## Phase 4A runtime contract

The database now provides:

- Versioned `ops.retry_policies`.
- Tenant-scoped `ops.idempotency_records` with a unique scope/key contract.
- `ops.reserve_idempotency(...)` for first-use, replay, and fingerprint conflict detection.
- Tenant-scoped `ops.outbox_events`.
- `ops.claim_outbox_events(...)` using `FOR UPDATE SKIP LOCKED`.
- Expired publishing-lease recovery.
- `ops.fail_outbox_event(...)` for deterministic retry or dead-letter transition.
- Tenant-scoped `ops.dead_letter_jobs`.
- `ops.move_outbox_to_dead_letter(...)`.
- `ops.replay_dead_letter(...)`.
- Forced row-level security and `app_runtime` execution privileges.

## Next scope — Phase 4B

Phase 4B connects these database primitives to application services:

1. Deterministic retry-delay calculator.
2. Idempotency application service.
3. Outbox repository and worker-facing service.
4. Dead-letter replay service with RBAC.
5. Runtime API probes for idempotency and replay boundaries.

Certification success does not auto-merge the branch.
