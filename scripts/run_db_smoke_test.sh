#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/scripts/db_smoke_test.sql
echo "DB_SMOKE_OK"
