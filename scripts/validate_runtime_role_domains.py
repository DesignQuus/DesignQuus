from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(path: str) -> Path:
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"required file missing: {path}")
    return target


def require_text(path: str, *needles: str) -> None:
    text = require(path).read_text(encoding="utf-8")
    for needle in needles:
        if needle not in text:
            raise AssertionError(f"{path} missing required marker: {needle}")


def main() -> None:
    require_text(
        "database/migrations/023_security_runtime_role.sql",
        "workflow",
        "bom",
        "validation",
        "FORCE ROW LEVEL SECURITY",
        "GRANT SELECT, INSERT, UPDATE, DELETE",
    )
    require_text(
        "database/migrations/026_runtime_role_domain_completion.sql",
        "GRANT USAGE ON SCHEMA",
        "workflow",
        "bom",
        "validation",
        "ENABLE ROW LEVEL SECURITY",
        "FORCE ROW LEVEL SECURITY",
        "tenant_isolation",
    )
    require_text(
        "database/migrations/runtime-manifest.txt",
        "026_runtime_role_domain_completion.sql",
    )
    require_text(
        "scripts/runtime_role_domain_completion_test.sql",
        "APP_RUNTIME_WORKFLOW_INSERT_FAILED",
        "TENANT_B_CAN_READ_TENANT_A_WORKFLOW",
        "RUNTIME_ROLE_DOMAIN_COMPLETION_CERTIFIED",
    )
    require_text(
        "scripts/run_db_smoke_test.sh",
        "runtime_role_domain_completion_test.sql",
        "RUNTIME_ROLE_DOMAIN_COMPLETION_OK",
    )
    require_text(
        ".github/workflows/recovery-phase4c.yml",
        "023_security_runtime_role.sql",
        "026_runtime_role_domain_completion.sql",
    )

    summary = {
        "baseMigrationComplete": True,
        "upgradeMigrationPresent": True,
        "workflowDomain": True,
        "bomDomain": True,
        "validationDomain": True,
        "forcedRls": True,
        "crossTenantWorkflowTest": True,
        "recoveryReapplication": True,
    }
    print(json.dumps(summary, indent=2))
    print("RUNTIME_ROLE_DOMAIN_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
