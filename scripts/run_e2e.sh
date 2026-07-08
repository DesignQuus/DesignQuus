#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for PostgreSQL E2E."
  exit 2
fi

cleanup() {
  docker compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose up -d db

for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U hvac -d hvac >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# 최소 Tenant / Project / Revision / File Version 생성
IDS=$(docker compose exec -T db psql -U hvac -d hvac -At <<'SQL'
WITH t AS (
  INSERT INTO auth.tenants (tenant_code, name) VALUES ('E2E', 'E2E Tenant') RETURNING id
), u AS (
  INSERT INTO auth.users (tenant_id, email, display_name, role_code)
  SELECT id, 'e2e@example.com', 'E2E', 'ADMIN' FROM t RETURNING id, tenant_id
), p AS (
  INSERT INTO project.projects (tenant_id, project_code, project_name, project_type, created_by)
  SELECT tenant_id, 'E2E-001', 'ERV E2E', 'HVAC', id FROM u RETURNING id, tenant_id
), r AS (
  INSERT INTO project.revisions (tenant_id, project_id, revision_no, title)
  SELECT tenant_id, id, 1, 'R1' FROM p RETURNING id, project_id, tenant_id
), f AS (
  INSERT INTO document.files (
    tenant_id, project_id, project_revision_id, file_name, original_file_name,
    file_type, mime_type, size_bytes, storage_key, sha256_hash
  ) SELECT tenant_id, project_id, id, 'fixture.pdf', 'fixture.pdf', 'PDF', 'application/pdf', 1,
           'e2e/fixture.pdf', repeat('a',64) FROM r RETURNING id, project_id, tenant_id
), fv AS (
  INSERT INTO document.file_versions (tenant_id, project_id, file_id, version_no, storage_key, file_hash)
  SELECT tenant_id, project_id, id, 1, 'e2e/fixture.pdf', repeat('a',64) FROM f RETURNING id
)
SELECT (SELECT tenant_id FROM p) || '|' || (SELECT id FROM p) || '|' || (SELECT id FROM r) || '|' || (SELECT id FROM fv);
SQL
)

IFS='|' read -r TENANT_ID PROJECT_ID REVISION_ID FILE_VERSION_ID <<< "$IDS"

echo "Prepared IDs: $TENANT_ID $PROJECT_ID $REVISION_ID $FILE_VERSION_ID"
if [ ! -d node_modules ]; then
  echo "node_modules not found. Run npm install first."
  exit 3
fi

DATABASE_URL="postgresql://hvac:hvac@localhost:5432/hvac" \
TEST_TENANT_ID="$TENANT_ID" \
TEST_PROJECT_ID="$PROJECT_ID" \
TEST_REVISION_ID="$REVISION_ID" \
TEST_FILE_VERSION_ID="$FILE_VERSION_ID" \
npm --workspace @hvac/api run test:e2e
