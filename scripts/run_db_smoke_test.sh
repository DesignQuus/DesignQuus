#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/scripts/db_smoke_test.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/scripts/tenant_isolation_test.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/scripts/reliability_recovery_test.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/scripts/runtime_role_domain_completion_test.sql

echo "DB_SMOKE_OK"
echo "TENANT_ISOLATION_OK"
echo "RELIABILITY_RECOVERY_OK"
echo "RUNTIME_ROLE_DOMAIN_COMPLETION_OK"
