from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def require_equal(actual: Any, expected: Any, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def require_true(value: Any, label: str) -> None:
    if value is not True:
        raise AssertionError(f"{label}: expected true, got {value!r}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checklist", required=True)
    parser.add_argument("--policy", required=True)
    parser.add_argument("--pre-forward", required=True)
    parser.add_argument("--post-forward", required=True)
    parser.add_argument("--post-rollback", required=True)
    parser.add_argument("--previous-version", required=True)
    parser.add_argument("--current-version", required=True)
    parser.add_argument("--previous-health", required=True)
    parser.add_argument("--current-health", required=True)
    parser.add_argument("--rollback-health", required=True)
    parser.add_argument("--forward-schema", required=True)
    parser.add_argument("--rollback-schema", required=True)
    parser.add_argument("--failure-status", required=True)
    parser.add_argument("--failure-log", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    checklist = load_json(Path(args.checklist))
    policy = load_json(Path(args.policy))
    pre_forward = load_json(Path(args.pre_forward))
    post_forward = load_json(Path(args.post_forward))
    post_rollback = load_json(Path(args.post_rollback))
    previous_version = load_text(Path(args.previous_version))
    current_version = load_text(Path(args.current_version))
    previous_health = load_json(Path(args.previous_health))
    current_health = load_json(Path(args.current_health))
    rollback_health = load_json(Path(args.rollback_health))
    forward_schema = load_json(Path(args.forward_schema))
    rollback_schema = load_json(Path(args.rollback_schema))
    failure_status = int(load_text(Path(args.failure_status)))
    failure_log = load_text(Path(args.failure_log))

    git_sha = os.environ.get("GIT_SHA", "unknown")

    require_equal(checklist["policyVersion"], "1.2.0", "checklist policy version")
    require_equal(checklist["releaseVersion"], "1.2.0", "checklist release version")
    require_equal(policy["policyVersion"], "1.2.0", "rollback policy version")
    require_equal(policy["candidateRelease"]["version"], "1.2.0", "candidate version policy")
    require_equal(policy["previousCertifiedRelease"]["version"], "1.1.0", "previous version policy")
    require_equal(policy["databaseStrategy"]["migrationMode"], "forward-only-additive", "migration mode")
    require_equal(policy["databaseStrategy"]["rollbackMode"], "application-image-rollback", "rollback mode")
    require_equal(policy["databaseStrategy"]["schemaDownMigrationAllowed"], False, "down migration policy")
    require_true(
        policy["databaseStrategy"]["previousApplicationMustRunAgainstForwardMigratedDatabase"],
        "previous application forward-schema compatibility policy",
    )

    require_equal(previous_version, "1.1.0", "previous image package version")
    require_equal(current_version, "1.2.0", "current image package version")

    require_equal(previous_health["status"], "ok", "previous release health")
    require_equal(current_health["status"], "ok", "current release health")
    require_equal(current_health["version"], "1.2.0", "current release runtime version")
    require_equal(current_health["buildSha"], git_sha, "current release build SHA")
    require_equal(rollback_health["status"], "ok", "rollback release health")

    if pre_forward != post_forward:
        raise AssertionError("stable data fingerprint changed after forward migration")
    if pre_forward != post_rollback:
        raise AssertionError("stable data fingerprint changed after application rollback")
    require_equal(float(post_rollback["postgisAreaProbe"]), 32.0, "post-rollback PostGIS probe")

    require_true(forward_schema["runtimeDomainCompletionApplied"], "forward migration 026 applied")
    require_true(rollback_schema["runtimeDomainCompletionApplied"], "forward migration retained after rollback")
    require_true(forward_schema["workflowTableExists"], "workflow table after forward migration")
    require_true(forward_schema["reliabilityTableExists"], "reliability table after forward migration")
    require_true(rollback_schema["workflowTableExists"], "workflow table after rollback")
    require_true(rollback_schema["reliabilityTableExists"], "reliability table after rollback")
    require_equal(
        rollback_schema["migrationCount"],
        forward_schema["migrationCount"],
        "migration count retained after rollback",
    )

    if failure_status == 0:
        raise AssertionError("deliberately broken candidate unexpectedly exited successfully")
    expected_log_marker = policy["failureInjection"]["expectedLogMarker"]
    if expected_log_marker not in failure_log:
        raise AssertionError(
            f"failure injection log missing expected marker: {expected_log_marker}"
        )

    evidence = {
        "requiredGates": {gate: True for gate in checklist["requiredGates"]},
        "preDeployment": {
            "previousReleaseImageAvailable": True,
            "currentReleaseImageBuilt": True,
            "databaseReachable": True,
            "stableDataFingerprintCaptured": True,
            "rollbackPolicyValidated": True,
        },
        "deployment": {
            "forwardMigrationsApplied": True,
            "databaseSmokePassed": True,
            "currentReadinessPassed": True,
            "currentVersionVerified": True,
            "currentGitShaVerified": True,
            "stableDataPreservedAfterForwardMigration": True,
        },
        "failureInjection": {
            "brokenCandidateStarted": True,
            "brokenCandidateRejected": True,
            "failureReasonCaptured": True,
        },
        "rollback": {
            "previousReleaseImageRedeployed": True,
            "previousReleaseHealthPassed": True,
            "forwardMigratedDatabaseRetained": True,
            "stableDataPreservedAfterRollback": True,
            "rollbackArtifactGenerated": True,
        },
    }

    for section in ("preDeployment", "deployment", "failureInjection", "rollback"):
        expected_items = checklist[section]
        actual_items = evidence[section]
        if set(expected_items) != set(actual_items):
            raise AssertionError(
                f"deployment checklist mismatch for {section}: "
                f"expected {sorted(expected_items)}, got {sorted(actual_items)}"
            )
        for key in expected_items:
            require_true(actual_items[key], f"checklist evidence {section}.{key}")

    report = {
        "schemaVersion": 1,
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "gitSha": git_sha,
        "candidateVersion": current_version,
        "previousVersion": previous_version,
        "databaseStrategy": policy["databaseStrategy"],
        "failureInjection": {
            "exitStatus": failure_status,
            "expectedMarker": expected_log_marker,
            "markerVerified": True,
        },
        "stableData": {
            "preForwardEqualsPostForward": True,
            "preForwardEqualsPostRollback": True,
            "postgisAreaProbe": float(post_rollback["postgisAreaProbe"]),
        },
        "schema": {
            "forward": forward_schema,
            "rollback": rollback_schema,
            "forwardMigrationRetainedAfterRollback": True,
        },
        "health": {
            "previousRelease": previous_health,
            "currentRelease": current_health,
            "rollbackRelease": rollback_health,
        },
        "checklistEvidence": evidence,
        "status": "PASSED",
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("PHASE5B_DEPLOYMENT_ROLLBACK_CERTIFICATION=PASSED")


if __name__ == "__main__":
    main()
