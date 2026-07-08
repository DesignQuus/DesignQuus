from pathlib import Path
import json
import re
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    "compose.yaml",
    "apps/api/Dockerfile",
    "apps/web/Dockerfile",
    "database/migrations/runtime-manifest.txt",
    "scripts/run_migrations.sh",
    "scripts/db_smoke_test.sql",
    "apps/api/src/modules/health/health.controller.ts",
    "apps/web/app/rule-studio/page.tsx",
    "apps/web/app/catalog-import/page.tsx",
    "apps/web/app/pipeline/page.tsx",
    "scripts/run_engineering_e2e_v10.py",
    "scripts/run_docker_e2e_v10.sh",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

compose = yaml.safe_load((ROOT / "compose.yaml").read_text(encoding="utf-8"))
services = compose["services"]
assert set(["db", "migrations", "db-smoke", "api", "web"]).issubset(services)
assert services["migrations"]["depends_on"]["db"]["condition"] == "service_healthy"
assert services["api"]["depends_on"]["db-smoke"]["condition"] == "service_completed_successfully"
assert services["web"]["depends_on"]["api"]["condition"] == "service_healthy"

manifest = [
    x.strip()
    for x in (
        ROOT / "database/migrations/runtime-manifest.txt"
    ).read_text(encoding="utf-8").splitlines()
    if x.strip()
]
assert len(manifest) == 21, len(manifest)
assert "005_job_claim_example.sql" not in manifest
assert "020_official_source_metadata_seed.sql" not in manifest

for migration in manifest:
    assert (ROOT / "database/migrations" / migration).exists(), migration

root_pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
assert root_pkg["version"].startswith("1.0.")
assert root_pkg["engines"]["node"] == ">=24 <25"

web_pkg = json.loads((ROOT / "apps/web/package.json").read_text(encoding="utf-8"))
assert web_pkg["dependencies"]["next"] == "16.2.10"

api_pkg = json.loads((ROOT / "apps/api/package.json").read_text(encoding="utf-8"))
assert api_pkg["version"].startswith("1.0.")

openapi = yaml.safe_load((ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8"))
assert len(openapi["paths"]) >= 64

print("OK")
print("Runtime migrations:", len(manifest))
print("Compose services:", ", ".join(services))
print("OpenAPI paths:", len(openapi["paths"]))
