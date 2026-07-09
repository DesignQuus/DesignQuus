# AI HVAC Engineering OS v1.2 — Production Hardening Phase 5A

## Certification status

**PASSED**

Phase 5A established versioned performance budgets and certified nine concurrent runtime scenarios with zero request errors. The certification also discovered and resolved an application-runtime database permission gap in the ERV workflow domain before the performance baseline was accepted.

## Certified branch

- Branch: `claude/ai-hvac-production-hardening-v1.2-20260709`
- Pull request: `#3`
- Certified commit: `6294d5d65bafba4dcfbaf03acd048efb9629ec0c`
- Performance Phase 5A workflow run ID: `28993993745`
- Production Hardening workflow run ID: `28993993722`
- Full Runtime Certification run ID: `28993993740`
- Bootstrap Certification run ID: `28993993776`
- Recovery Phase 4C run ID: `28993993739`
- Reliability Phase 4B run ID: `28993993729`

## Performance policy

- Policy file: `config/performance-budgets.v1.2.json`
- Policy version: `1.2.0`
- Certified environment: `github-hosted-runner-docker-compose`
- Global maximum error rate: `0.0`
- Scenario count: `9`
- Total measured suite wall time: `1.194405` seconds

## Certified scenario results

| Scenario | Requests | Concurrency | p50 ms | p95 ms | p99 ms | Throughput RPS | Error rate | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Health liveness | 100 | 20 | 18.059 | 22.776 | 24.539 | 928.269 | 0.0 | PASSED |
| Health readiness | 60 | 10 | 11.580 | 27.922 | 37.053 | 702.863 | 0.0 | PASSED |
| Reliability read | 80 | 20 | 32.067 | 53.674 | 73.880 | 517.640 | 0.0 | PASSED |
| Reliability write | 60 | 10 | 15.256 | 20.808 | 25.131 | 596.631 | 0.0 | PASSED |
| DB pool saturation | 120 | 50 | 40.658 | 73.470 | 76.299 | 651.458 | 0.0 | PASSED |
| Calculation throughput | 150 | 30 | 16.732 | 37.476 | 46.812 | 1034.709 | 0.0 | PASSED |
| ERV selection throughput | 40 | 8 | 12.361 | 16.216 | 17.604 | 608.366 | 0.0 | PASSED |
| Drawing review read | 80 | 20 | 31.662 | 36.529 | 39.477 | 569.248 | 0.0 | PASSED |
| Drawing upload | 20 | 4 | 10.960 | 14.550 | 15.607 | 345.241 | 0.0 | PASSED |

All configured p95, p99, throughput, and zero-error budgets passed.

## Database performance evidence

- ERV design runs created: `43`
- Idempotency records present after test: `64`
- Uploaded performance files created: `23`
- Drawing extractions read fixture: `50`
- Database backends at report time: `11`
- Transaction commits: `619`
- Transaction rollbacks: `8`
- Shared-buffer block hits: `469973`
- Disk block reads: `2755`
- Temporary files: `0`
- Deadlocks: `0`

## Performance harness contract

The Phase 5A harness records:

- Request count and concurrency.
- Success and error counts.
- Error rate.
- HTTP status distribution.
- Wall-clock duration.
- Throughput in requests per second.
- Minimum, mean, p50, p95, p99, and maximum latency.
- Per-metric budget checks.
- Partial scenario reports when warmup or runtime failures occur.
- Post-test metrics snapshot.
- Database-side evidence after the load run.

## Runtime defect discovered and resolved

The first complete performance diagnostic showed eight scenarios passing and ERV selection failing during warmup with HTTP 500.

Root cause:

- `TenantTransaction` correctly executed work as the non-superuser `app_runtime` role.
- The runtime-role security migration granted the core schemas but omitted the `workflow`, `bom`, and `validation` domains.
- `workflow.erv_design_runs` therefore could not be inserted under the production runtime role.

Resolution:

1. Added migration `026_runtime_role_domain_completion.sql`.
2. Granted runtime access to optional engineering domains when those schemas exist.
3. Enabled and forced RLS for tenant-owned tables in those domains.
4. Added a runtime certification test that inserts an ERV design run as `app_runtime`.
5. Added a cross-tenant workflow visibility test.
6. Added a static runtime-domain completeness validator.
7. Updated recovery certification to reapply both the base runtime role and domain-completion grants after restore.
8. Made the optional-domain migration schema-aware so reduced bootstrap compositions do not fail when an optional schema is absent.

The final certified run proves:

- Full runtime ERV workflow writes succeed under `app_runtime`.
- Cross-tenant workflow reads remain blocked.
- Reduced bootstrap compositions still succeed.
- Recovery restores the completed runtime permission model.

## Performance artifact

- Artifact name: `ai-hvac-v12-phase5a-performance-artifacts`
- Artifact ID: `8189011899`
- Artifact digest: `sha256:8231fb072f25a520b1a579a62332b1019c6400d08524a027d3fd8b2190195bdb`

The artifact contains:

- `performance-baseline.json`
- `performance-db-report.json`
- `pre-performance-ready.json`
- `post-performance-ready.json`
- `post-performance-metrics.txt`

## Regression gates

- Reliability Phase 4B application and API certification: `PASSED`
- Recovery Phase 4C destructive restore certification: `PASSED`
- Production Hardening source/build gate: `PASSED`
- SBOM generation and dependency audit: `PASSED`
- API/Web CRITICAL vulnerability scans: `PASSED`
- Production runtime probes: `PASSED`
- Calculation/CAD regressions: `PASSED`
- Docker/PostGIS Runtime Certification: `PASSED`
- Bootstrap Runtime Certification: `PASSED`

## Next scope — Phase 5B

Phase 5B certifies production deployment and rollback:

1. Production deployment checklist validation.
2. Release version and build-metadata verification.
3. Forward migration deployment drill.
4. Deliberate release failure injection.
5. Rollback to the certified previous release.
6. Post-rollback health verification.
7. Post-rollback database and tenant-isolation verification.
8. Deployment and rollback certification artifacts.

Certification success does not auto-merge the branch.
