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
    package = json.loads(require("package.json").read_text(encoding="utf-8"))
    checklist = json.loads(
        require("config/deployment-checklist.v1.2.json").read_text(encoding="utf-8")
    )
    policy = json.loads(
        require("config/release-rollback-policy.v1.2.json").read_text(encoding="utf-8")
    )

    assert package["version"] == "1.2.0"
    assert checklist["policyVersion"] == "1.2.0"
    assert checklist["releaseVersion"] == "1.2.0"
    assert policy["policyVersion"] == "1.2.0"
    assert policy["candidateRelease"]["version"] == "1.2.0"
    assert policy["previousCertifiedRelease"]["version"] == "1.1.0"
    assert policy["databaseStrategy"]["migrationMode"] == "forward-only-additive"
    assert policy["databaseStrategy"]["rollbackMode"] == "application-image-rollback"
    assert policy["databaseStrategy"]["schemaDownMigrationAllowed"] is False
    assert policy["databaseStrategy"]["previousApplicationMustRunAgainstForwardMigratedDatabase"] is True

    required_sections = {
        "requiredGates",
        "preDeployment",
        "deployment",
        "failureInjection",
        "rollback",
    }
    assert required_sections.issubset(checklist)
    for section in required_sections:
        assert checklist[section], section

    require_text(
        "scripts/deployment_rollback_fixture.sql",
        "DEPLOYMENT_ROLLBACK_FIXTURE_READY",
        "DEPLOY-ROLLBACK-PROJECT",
        "Stable Rollback Revision",
    )
    require_text(
        "scripts/deployment_stable_fingerprint.sql",
        "tenantChecksum",
        "projectChecksum",
        "revisionChecksum",
        "postgisAreaProbe",
    )
    require_text(
        "scripts/deployment_schema_report.sql",
        "migrationCount",
        "runtimeDomainCompletionApplied",
        "026_runtime_role_domain_completion.sql",
        "workflowTableExists",
        "reliabilityTableExists",
    )
    require_text(
        "scripts/verify_deployment_rollback.py",
        "previous image package version",
        "current release build SHA",
        "stable data fingerprint changed after forward migration",
        "stable data fingerprint changed after application rollback",
        "forward migration retained after rollback",
        "Production startup blocked",
        "PHASE5B_DEPLOYMENT_ROLLBACK_CERTIFICATION=PASSED",
    )
    require_text(
        ".github/workflows/deployment-rollback-phase5b.yml",
        "Checkout previous certified release",
        "Build previous release image",
        "Build current release image",
        "Apply previous release migrations",
        "Capture pre-forward fingerprint",
        "Deploy previous release",
        "Apply v1.2 forward migrations",
        "Deploy current release",
        "Inject deliberate failed release",
        "Rollback to previous release image",
        "Capture post-rollback fingerprint and schema report",
        "Verify deployment and rollback",
        "Upload Phase 5B deployment rollback artifacts",
    )

    summary = {
        "version": "1.2.0",
        "previousReleaseVersion": "1.1.0",
        "forwardOnlyAdditiveMigration": True,
        "applicationImageRollback": True,
        "schemaDownMigrationAllowed": False,
        "stableDataFingerprint": True,
        "versionAndBuildMetadataVerification": True,
        "deliberateFailureInjection": True,
        "previousAppForwardSchemaCompatibility": True,
        "rollbackArtifacts": True,
    }
    print(json.dumps(summary, indent=2))
    print("PHASE5B_DEPLOYMENT_ROLLBACK_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
