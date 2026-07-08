from pathlib import Path
import json
import re
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    "database/migrations/012_cad_transform.sql",
    "workers/cad-worker/cad/contracts.py",
    "workers/cad-worker/cad/dxf_adapter.py",
    "workers/cad-worker/cad/dwg_converter.py",
    "workers/cad-worker/cad/transform.py",
    "workers/cad-worker/cad/transform_geometry.py",
    "docs/CAD_COORDINATE_POLICY.md",
    "openapi/openapi.yaml",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, missing

sql = (ROOT / "database/migrations/012_cad_transform.sql").read_text(encoding="utf-8")
cad_tables = len(re.findall(r"CREATE TABLE cad\.", sql))
assert cad_tables == 5, cad_tables

spec = yaml.safe_load((ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8"))
assert spec["openapi"] == "3.2.0"
assert len(spec["paths"]) >= 31
assert "/v1/cad/transforms/calibrate" in spec["paths"]
assert "/v1/cad/objects/{cadObjectId}/page-geometry" in spec["paths"]

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
    raise SystemExit("CAD worker tests failed")

print("OK")
print("CAD extension tables:", cad_tables)
print("OpenAPI paths:", len(spec["paths"]))
print(result.stdout.strip() or result.stderr.strip())
