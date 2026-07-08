from pathlib import Path
import json
import subprocess
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]

required = [
    ".github/workflows/runtime-certification.yml",
    "certification/runtime-certificate.schema.json",
    "certification/runtime-certification-policy.v1.0.1.json",
    "scripts/certify_runtime_v101.sh",
    "scripts/generate_runtime_certificate.py",
    "scripts/verify_runtime_certificate.py",
    "artifacts/runtime-certification-status-v1.0.1.json",
]
missing = [item for item in required if not (ROOT / item).exists()]
assert not missing, missing

workflow = yaml.safe_load(
    (ROOT / ".github/workflows/runtime-certification.yml")
    .read_text(encoding="utf-8")
)
jobs = workflow["jobs"]
assert "source-quality" in jobs
assert "runtime-certification" in jobs
assert jobs["runtime-certification"]["needs"] == ["source-quality"]

workflow_text = (
    ROOT / ".github/workflows/runtime-certification.yml"
).read_text(encoding="utf-8")
for token in [
    "actions/checkout@v5",
    "actions/setup-node@v6",
    "actions/setup-python@v6",
    'node-version: "24.17.0"',
    "scripts/certify_runtime_v101.sh",
]:
    assert token in workflow_text, token

compose = yaml.safe_load((ROOT / "compose.yaml").read_text(encoding="utf-8"))
for service_name in ["db", "migrations", "db-smoke"]:
    assert (
        compose["services"][service_name]["image"]
        == "postgis/postgis:18-3.6"
    )

assert (
    compose["services"]["migrations"]["depends_on"]["db"]["condition"]
    == "service_healthy"
)
assert (
    compose["services"]["api"]["depends_on"]["db-smoke"]["condition"]
    == "service_completed_successfully"
)
assert (
    compose["services"]["web"]["depends_on"]["api"]["condition"]
    == "service_healthy"
)

policy = json.loads(
    (
        ROOT
        / "certification/runtime-certification-policy.v1.0.1.json"
    ).read_text(encoding="utf-8")
)
required_policy = policy["required"]
assert required_policy["runtime"]["node_major"] == 24
assert required_policy["runtime"]["postgres_major"] == 18
assert required_policy["runtime"]["postgis_major_minor"] == "3.6"
assert required_policy["quality_gates"]["blockers"] == 0

status = json.loads(
    (
        ROOT / "artifacts/runtime-certification-status-v1.0.1.json"
    ).read_text(encoding="utf-8")
)
assert status["status"] == "NOT_EXECUTED"

for shell_file in [
    ROOT / "scripts/run_migrations.sh",
    ROOT / "scripts/certify_runtime_v101.sh",
    ROOT / "scripts/run_docker_e2e_v10.sh",
]:
    completed = subprocess.run(
        ["sh", "-n", str(shell_file)],
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, (
        shell_file.name,
        completed.stderr,
    )

for python_file in [
    ROOT / "scripts/generate_runtime_certificate.py",
    ROOT / "scripts/verify_runtime_certificate.py",
]:
    completed = subprocess.run(
        [sys.executable, "-m", "py_compile", str(python_file)],
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, (
        python_file.name,
        completed.stderr,
    )

print("OK")
print("Workflow jobs:", ", ".join(jobs))
print("PostGIS image:", compose["services"]["db"]["image"])
print("Certification status:", status["status"])
