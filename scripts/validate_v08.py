from pathlib import Path
import json
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    "database/migrations/018_space_attributes_ventilation_pipeline.sql",
    "workers/calc-worker/space_profile/resolver.py",
    "workers/calc-worker/ventilation_rule/engine.py",
    "workers/calc-worker/pipeline/space_ventilation.py",
    "config/official-ventilation-sources.v0.8.json",
    "config/ventilation-rule-set.demo.v0.8.json",
    "docs/VENTILATION_RULE_GOVERNANCE.md",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

sql = (
    ROOT / "database/migrations/018_space_attributes_ventilation_pipeline.sql"
).read_text(encoding="utf-8")

new_tables = len(re.findall(
    r"CREATE TABLE (?:model|compliance|workflow)\.",
    sql,
))
assert new_tables == 7, new_tables

for token in [
    "space_design_profiles",
    "space_profile_evidence",
    "authoritative_sources",
    "ventilation_rule_sets",
    "ventilation_rule_parameters",
    "space_ventilation_runs",
    "space_ventilation_items",
]:
    assert token in sql, token

source_registry = json.loads(
    (
        ROOT / "config/official-ventilation-sources.v0.8.json"
    ).read_text(encoding="utf-8")
)
assert source_registry["snapshot_date"] == "2026-07-08"
assert len(source_registry["sources"]) >= 3

demo_rules = json.loads(
    (
        ROOT / "config/ventilation-rule-set.demo.v0.8.json"
    ).read_text(encoding="utf-8")
)
assert "NOT A LEGAL VENTILATION RATE" in demo_rules["warning"]

spec = yaml.safe_load(
    (ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8")
)
assert spec["openapi"] == "3.2.0"
assert len(spec["paths"]) >= 53
assert (
    "/v1/space-ventilation/spaces/{spaceId}/profiles/resolve"
    in spec["paths"]
)
assert "/v1/space-ventilation/runs" in spec["paths"]

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
    raise SystemExit("Calc/ventilation v0.8 tests failed")

print("OK")
print("v0.8 extension tables:", new_tables)
print("OpenAPI paths:", len(spec["paths"]))
print(result.stdout.strip() or result.stderr.strip())
