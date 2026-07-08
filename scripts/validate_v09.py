from pathlib import Path
import json
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    "database/migrations/021_rule_studio_catalog_import.sql",
    "workers/calc-worker/rule_studio/compiler.py",
    "workers/calc-worker/rule_studio/test_runner.py",
    "workers/calc-worker/rule_studio/applicability.py",
    "workers/calc-worker/catalog_import/importer.py",
    "schemas/ventilation-rule-draft.schema.json",
    "schemas/erv-catalog-canonical.schema.json",
    "config/official-source-snapshot.v0.9.json",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

sql = (
    ROOT / "database/migrations/021_rule_studio_catalog_import.sql"
).read_text(encoding="utf-8")

new_tables = len(re.findall(
    r"CREATE TABLE (?:compliance|catalog)\.",
    sql,
))
assert new_tables == 10, new_tables

snapshot = json.loads(
    (
        ROOT / "config/official-source-snapshot.v0.9.json"
    ).read_text(encoding="utf-8")
)
assert snapshot["snapshot_date"] == "2026-07-08"
assert len(snapshot["sources"]) >= 3

spec = yaml.safe_load(
    (ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8")
)
assert spec["openapi"] == "3.2.0"
assert len(spec["paths"]) >= 63
assert "/v1/rule-studio/drafts" in spec["paths"]
assert "/v1/catalog-import/runs" in spec["paths"]

result = subprocess.run(
    [
        sys.executable,
        "-m",
        "unittest",
        "discover",
        "-s",
        str(ROOT / "workers/calc-worker/tests"),
        "-p",
        "test_*.py",
    ],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr)
    raise SystemExit("v0.9 calc/rule/catalog tests failed")

print("OK")
print("v0.9 extension tables:", new_tables)
print("OpenAPI paths:", len(spec["paths"]))
print(result.stdout.strip() or result.stderr.strip())
