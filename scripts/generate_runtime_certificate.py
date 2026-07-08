from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import os
import platform
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run(*args: str, default: str = "") -> str:
    try:
        completed = subprocess.run(
            list(args),
            check=True,
            capture_output=True,
            text=True,
        )
        return completed.stdout.strip()
    except Exception:
        return default


def load_json(path: Path, default: dict | None = None) -> dict:
    if not path.exists():
        return default or {}
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    output_path = Path(
        os.environ.get(
            "RUNTIME_CERTIFICATE_PATH",
            ROOT / "artifacts/runtime-certificate-v1.0.1.json",
        )
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    e2e = load_json(
        ROOT / "artifacts/e2e-engineering-v1.0.json",
        {},
    )
    runtime_facts = load_json(
        ROOT / "artifacts/runtime-facts-v1.0.1.json",
        {},
    )

    blockers = runtime_facts.get("blockers", [])
    e2e_status = e2e.get("status", "FAILED")

    required_gate = (
        runtime_facts.get("db_smoke_status") == "PASSED"
        and runtime_facts.get("api_health_status") == "PASSED"
        and runtime_facts.get("web_http_status") == "PASSED"
        and e2e_status == "PASSED"
        and len(blockers) == 0
    )

    certificate = {
        "certificate_version": "1.0.1",
        "status": "PASSED" if required_gate else "FAILED",
        "certified_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "git_sha": os.environ.get(
                "GITHUB_SHA",
                run("git", "rev-parse", "HEAD", default="UNKNOWN"),
            ),
            "git_ref": os.environ.get(
                "GITHUB_REF",
                run(
                    "git",
                    "rev-parse",
                    "--abbrev-ref",
                    "HEAD",
                    default="UNKNOWN",
                ),
            ),
        },
        "runtime": {
            "node_version": runtime_facts.get("node_version", "UNKNOWN"),
            "python_version": platform.python_version(),
            "docker_version": runtime_facts.get("docker_version", "UNKNOWN"),
            "docker_compose_version": runtime_facts.get(
                "docker_compose_version",
                "UNKNOWN",
            ),
        },
        "database": {
            "postgres_version": runtime_facts.get(
                "postgres_version",
                "UNKNOWN",
            ),
            "postgis_version": runtime_facts.get(
                "postgis_version",
                "UNKNOWN",
            ),
            "migration_count": runtime_facts.get("migration_count", 0),
            "db_smoke_status": runtime_facts.get(
                "db_smoke_status",
                "FAILED",
            ),
        },
        "application": {
            "api_health_status": runtime_facts.get(
                "api_health_status",
                "FAILED",
            ),
            "web_http_status": runtime_facts.get(
                "web_http_status",
                "FAILED",
            ),
            "api_image": runtime_facts.get("api_image", "UNKNOWN"),
            "web_image": runtime_facts.get("web_image", "UNKNOWN"),
        },
        "engineering_e2e": {
            "status": e2e_status,
            "required_flow_m3_h": (
                e2e.get("ventilation", {}).get("required_flow_m3_h")
            ),
            "selected_model": (
                e2e.get("selection", {}).get("selected_model")
            ),
            "bom_item_count": (
                e2e.get("bom", {}).get("item_count")
            ),
            "approval_gate": (
                e2e.get("approval_gate", {}).get("status")
            ),
        },
        "quality_gates": {
            "calc_rule_catalog_tests": runtime_facts.get(
                "calc_rule_catalog_tests",
                0,
            ),
            "cad_geometry_tests": runtime_facts.get(
                "cad_geometry_tests",
                0,
            ),
            "npm_audit_vulnerabilities": runtime_facts.get(
                "npm_audit_vulnerabilities",
                -1,
            ),
            "blockers": len(blockers),
            "blocker_codes": blockers,
        },
    }

    output_path.write_text(
        json.dumps(certificate, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(certificate, ensure_ascii=False, indent=2))

    if certificate["status"] != "PASSED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
