from __future__ import annotations

from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"CERTIFICATE_INVALID: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    certificate_path = Path(
        sys.argv[1]
        if len(sys.argv) > 1
        else ROOT / "artifacts/runtime-certificate-v1.0.1.json"
    )
    policy_path = ROOT / "certification/runtime-certification-policy.v1.0.1.json"

    cert = json.loads(certificate_path.read_text(encoding="utf-8"))
    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    required = policy["required"]

    if cert.get("status") != "PASSED":
        fail("certificate status is not PASSED")

    node_version = str(cert["runtime"]["node_version"]).lstrip("v")
    if int(node_version.split(".")[0]) != required["runtime"]["node_major"]:
        fail("wrong Node.js major version")

    if not str(cert["database"]["postgres_version"]).startswith(
        str(required["runtime"]["postgres_major"])
    ):
        fail("wrong PostgreSQL major version")

    if required["runtime"]["postgis_major_minor"] not in str(
        cert["database"]["postgis_version"]
    ):
        fail("wrong PostGIS version")

    if cert["database"]["migration_count"] < required["database"]["minimum_migration_count"]:
        fail("insufficient migration count")

    if cert["database"]["db_smoke_status"] != required["database"]["db_smoke_status"]:
        fail("DB smoke test did not pass")

    for key, expected in required["application"].items():
        if cert["application"].get(key) != expected:
            fail(f"application gate failed: {key}")

    for key, expected in required["engineering_e2e"].items():
        if cert["engineering_e2e"].get(key) != expected:
            fail(f"engineering E2E gate failed: {key}")

    for key, expected in required["quality_gates"].items():
        if cert["quality_gates"].get(key) != expected:
            fail(f"quality gate failed: {key}")

    print("RUNTIME_CERTIFICATE_VALID")


if __name__ == "__main__":
    main()
