from pathlib import Path
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    "database/migrations/016_exact_geometry_space_promotion.sql",
    "workers/cad-worker/cad/exact_geometry.py",
    "workers/cad-worker/cad/units.py",
    "workers/cad-worker/cad/exact_room_detector.py",
    "workers/cad-worker/cad/ai_cad_matcher_v07.py",
    "workers/cad-worker/cad/space_promotion.py",
    "docs/EXACT_GEOMETRY_POLICY.md",
    "docs/CAD_UNIT_RESOLUTION.md",
    "docs/SPACE_PROMOTION_V07.md",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

sql = (
    ROOT / "database/migrations/016_exact_geometry_space_promotion.sql"
).read_text(encoding="utf-8")

new_tables = len(re.findall(r"CREATE TABLE cad\.", sql))
assert new_tables == 4, new_tables

for token in [
    "ST_MakeValid",
    "ST_Intersection",
    "ST_Union",
    "ST_Area",
    "cad.exact_iou",
]:
    assert token in sql, token

spec = yaml.safe_load(
    (ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8")
)
assert spec["openapi"] == "3.2.0"
assert len(spec["paths"]) >= 46
assert "/v1/cad-geometry/unit-resolutions" in spec["paths"]
assert (
    "/v1/cad-geometry/space-promotion-runs/{promotionRunId}/execute"
    in spec["paths"]
)

result = subprocess.run(
    [
        sys.executable,
        "-m",
        "unittest",
        "discover",
        "-s",
        str(ROOT / "workers/cad-worker/tests"),
        "-p",
        "test_*.py",
    ],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr)
    raise SystemExit("CAD v0.7 tests failed")

print("OK")
print("v0.7 extension tables:", new_tables)
print("OpenAPI paths:", len(spec["paths"]))
print(result.stdout.strip() or result.stderr.strip())
