#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

ARTIFACTS_DIR="$ROOT_DIR/artifacts"
mkdir -p "$ARTIFACTS_DIR"

cleanup() {
  if [ "${KEEP_RUNTIME_STACK:-0}" != "1" ]; then
    docker compose down -v --remove-orphans >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

wait_for_url() {
  url="$1"
  label="$2"
  attempts="${3:-90}"
  i=0
  until curl -fsS "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$attempts" ]; then
      echo "TIMEOUT: $label ($url)" >&2
      docker compose ps
      docker compose logs --no-color > "$ARTIFACTS_DIR/docker-compose.log" 2>&1 || true
      exit 1
    fi
    sleep 2
  done
}

echo "[1/9] Runtime preflight"
docker version --format '{{.Server.Version}}'
docker compose version
node --version
python --version

echo "[2/9] Python regression tests"
CALC_OUTPUT="$(
  python -m unittest discover \
    -s workers/calc-worker/tests \
    -p 'test_*.py' 2>&1
)"
printf '%s\n' "$CALC_OUTPUT"
CALC_COUNT="$(printf '%s\n' "$CALC_OUTPUT" | sed -n 's/^Ran \([0-9][0-9]*\) tests.*/\1/p' | tail -1)"

CAD_OUTPUT="$(
  python -m unittest discover \
    -s workers/cad-worker/tests \
    -p 'test_*.py' 2>&1
)"
printf '%s\n' "$CAD_OUTPUT"
CAD_COUNT="$(printf '%s\n' "$CAD_OUTPUT" | sed -n 's/^Ran \([0-9][0-9]*\) tests.*/\1/p' | tail -1)"

echo "[3/9] Node build and audit"
npm install
npm run build
AUDIT_JSON="$(npm audit --json)"
printf '%s\n' "$AUDIT_JSON" > "$ARTIFACTS_DIR/npm-audit-v1.0.1.json"
AUDIT_TOTAL="$(
  printf '%s\n' "$AUDIT_JSON" \
    | python -c "import json,sys; print(json.load(sys.stdin)['metadata']['vulnerabilities']['total'])"
)"
test "$AUDIT_TOTAL" = "0"

echo "[4/9] Pull database image"
docker compose pull db migrations db-smoke

echo "[5/9] Build application images"
docker compose build --pull api web

echo "[6/9] Start full stack"
docker compose up -d
wait_for_url "http://localhost:3001/v1/health" "API"
wait_for_url "http://localhost:3000" "Web"

echo "[7/9] Database facts"
POSTGRES_VERSION="$(
  docker compose exec -T db psql \
    -U "${POSTGRES_USER:-hvac}" \
    -d "${POSTGRES_DB:-hvac}" \
    -Atc "SHOW server_version;"
)"
POSTGIS_VERSION="$(
  docker compose exec -T db psql \
    -U "${POSTGRES_USER:-hvac}" \
    -d "${POSTGRES_DB:-hvac}" \
    -Atc "SELECT postgis_version();"
)"
MIGRATION_COUNT="$(
  docker compose exec -T db psql \
    -U "${POSTGRES_USER:-hvac}" \
    -d "${POSTGRES_DB:-hvac}" \
    -Atc "SELECT count(*) FROM public.schema_migrations;"
)"

docker compose run --rm db-smoke

echo "[8/9] Engineering E2E"
python scripts/run_engineering_e2e_v10.py

API_IMAGE="$(docker compose images -q api | head -1)"
WEB_IMAGE="$(docker compose images -q web | head -1)"
DOCKER_VERSION="$(docker version --format '{{.Server.Version}}')"
COMPOSE_VERSION="$(docker compose version --short)"
NODE_VERSION="$(node --version)"

cat > "$ARTIFACTS_DIR/runtime-facts-v1.0.1.json" <<JSON
{
  "node_version": "$NODE_VERSION",
  "docker_version": "$DOCKER_VERSION",
  "docker_compose_version": "$COMPOSE_VERSION",
  "postgres_version": "$POSTGRES_VERSION",
  "postgis_version": "$POSTGIS_VERSION",
  "migration_count": $MIGRATION_COUNT,
  "db_smoke_status": "PASSED",
  "api_health_status": "PASSED",
  "web_http_status": "PASSED",
  "api_image": "$API_IMAGE",
  "web_image": "$WEB_IMAGE",
  "calc_rule_catalog_tests": ${CALC_COUNT:-0},
  "cad_geometry_tests": ${CAD_COUNT:-0},
  "npm_audit_vulnerabilities": $AUDIT_TOTAL,
  "blockers": []
}
JSON

echo "[9/9] Generate and verify certificate"
python scripts/generate_runtime_certificate.py
python scripts/verify_runtime_certificate.py

docker compose ps > "$ARTIFACTS_DIR/docker-compose-ps-v1.0.1.txt"
docker compose logs --no-color > "$ARTIFACTS_DIR/docker-compose-v1.0.1.log" 2>&1 || true

echo "RUNTIME_CERTIFICATION_PASSED"
