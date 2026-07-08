#!/usr/bin/env sh
set -eu

cleanup() {
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose up -d --build

echo "Waiting for web..."
i=0
until curl -fsS http://localhost:3000 >/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    docker compose ps
    docker compose logs --no-color
    exit 1
  fi
  sleep 2
done

curl -fsS http://localhost:3001/v1/health
curl -fsS http://localhost:3000 >/dev/null

docker compose exec -T db psql \
  -U "${POSTGRES_USER:-hvac}" \
  -d "${POSTGRES_DB:-hvac}" \
  -Atc "SELECT count(*) FROM public.schema_migrations;"

python scripts/run_engineering_e2e_v10.py

echo "DOCKER_E2E_OK"
