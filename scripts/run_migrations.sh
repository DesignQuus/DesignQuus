#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/app/database/migrations}"
MANIFEST="${MIGRATIONS_DIR}/runtime-manifest.txt"

if [ ! -f "$MANIFEST" ]; then
  echo "Migration manifest not found: $MANIFEST" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    migration_name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

while IFS= read -r migration || [ -n "$migration" ]; do
  [ -z "$migration" ] && continue
  file="${MIGRATIONS_DIR}/${migration}"

  if [ ! -f "$file" ]; then
    echo "Migration file missing: $file" >&2
    exit 1
  fi

  already_applied="$(
    psql "$DATABASE_URL" -Atq \
      -v migration_name="$migration" \
      -c "SELECT 1 FROM public.schema_migrations WHERE migration_name = :'migration_name';"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "SKIP  $migration"
    continue
  fi

  echo "APPLY $migration"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v migration_name="$migration" \
    -c "INSERT INTO public.schema_migrations(migration_name) VALUES (:'migration_name');"

done < "$MANIFEST"

echo "MIGRATIONS_OK"
