# AI HVAC Engineering OS v1.1 — Full Source Certified

## Certification status

**PASSED**

The canonical AI HVAC v1.1 source payload was reconstructed, verified, hydrated into the repository, built, tested, migrated, started as a Docker stack, exercised through engineering E2E, and certified by GitHub Actions.

## Canonical source

- Runtime-core source files: `227`
- ZIP bytes: `181064`
- Uncompressed source bytes: `448922`
- Canonical ZIP SHA-256: `e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd`
- Hydrated source commit: `0d296e5708c56c8c1a259224382f832c4c0c312f`

## Authoritative full-source certification

- Workflow: `Runtime Certification`
- Workflow run ID: `28978907951`
- Certification branch head: `010f72167beaa67836e15af434c0bfd392c09dfd`
- Certified merge ref SHA: `1dd512af8925743e0f737a6017cbf0e113487b4d`
- Certified at: `2026-07-08T22:07:23.976064+00:00`
- Diagnostics artifact ID: `8183213714`
- Artifact digest: `sha256:740afbf9e25add6f4dfbc4a58b3c4324f203dda790673e771b7140c13524c1fd`

## Runtime environment

- Node.js: `v24.17.0`
- Python: `3.13.14`
- Docker: `28.0.4`
- Docker Compose: `2.38.2`
- PostgreSQL: `18.4`
- PostGIS: `3.6`

## Database and application gates

- Applied migrations: `21`
- DB smoke test: `PASSED`
- API health: `PASSED`
- Web HTTP: `PASSED`
- npm audit vulnerabilities: `0`

## Engineering quality gates

- Calculation / rule / catalog tests: `38`
- CAD / geometry tests: `45`
- Engineering E2E: `PASSED`
- Required ventilation flow: `500.0 m³/h`
- Selected ERV model: `ERV-A`
- BOM item count: `4`
- Approval gate: `REVIEW_READY`
- Blockers: `0`

## Runtime defects resolved during certification

1. PostgreSQL target-database readiness now waits for an actual `SELECT 1` before bootstrap SQL.
2. Web Docker dependency stage now includes the PDF.js postinstall script and packages the generated worker asset.
3. Next.js/Turbopack Docker builds now use an explicit monorepo root and matching lockfile context.
4. Runtime migration tracking no longer relies on unresolved `psql -c` variable interpolation.
5. Runtime failures capture console, Docker Compose, and migration diagnostics as workflow artifacts.

## Pull request state

PR `#2` remains open and unmerged. Certification success does not merge the branch automatically.
