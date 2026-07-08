from pathlib import Path
import re, yaml

ROOT = Path(__file__).resolve().parents[1]

spec = yaml.safe_load((ROOT / "openapi/openapi.yaml").read_text(encoding="utf-8"))
assert spec["openapi"] == "3.2.0"

sql = (ROOT / "database/migrations/002_foundation.sql").read_text(encoding="utf-8")
schemas = ["project", "document", "model", "compliance", "calculation", "approval"]

by_schema = {
    schema: len(re.findall(rf"CREATE TABLE {schema}\.", sql))
    for schema in schemas
}

assert sum(by_schema.values()) == 23, by_schema
assert len(spec["paths"]) == 14, len(spec["paths"])

print("OK")
print("Foundation tables:", sum(by_schema.values()))
print("By schema:", by_schema)
print("OpenAPI paths:", len(spec["paths"]))
