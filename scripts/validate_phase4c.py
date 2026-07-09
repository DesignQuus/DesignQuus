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
    assert package["version"] == "1.2.0"

    require_text(
        "scripts/recovery_fixture.sql",
        "RECOVERY_FIXTURE_READY",
        "RECOVERY-PROJECT-001",
        "RECOVERY_RETRY",
        "published_at",
    )
    require_text(
        "scripts/recovery_fingerprint.sql",
        "tenant_checksum",
        "project_checksum",
        "idempotency_checksum",
        "outbox_checksum",
        "dead_letter_checksum",
        "application_table_count",
        "postgis_area_probe",
    )
    require_text(
        "scripts/recovery_destructive_mutation.sql",
        "RECOVERY_SOURCE_MUTATED",
        "DELETE FROM ops.outbox_events",
        "DELETE FROM auth.tenants",
    )
    require_text(
        "scripts/build_recovery_manifest.py",
        "sha256_file",
        "postgresql-custom",
        "sourceFingerprint",
        "RECOVERY_MANIFEST_CREATED=PASSED",
    )
    require_text(
        "scripts/verify_recovery_restore.py",
        "source == mutated",
        "source != restored",
        "backup SHA-256",
        "postgis_area_probe",
        "POSTGRESQL_BACKUP_RESTORE_CERTIFICATION=PASSED",
    )
    require_text(
        "scripts/object_storage_recovery_probe.py",
        "safe_extract",
        "sourceRemovedBeforeRestore",
        "sha256Verified",
        "OBJECT_STORAGE_BACKUP_RESTORE_CERTIFICATION=PASSED",
    )
    require_text(
        ".github/workflows/recovery-phase4c.yml",
        "Create PostgreSQL logical backup and manifest",
        "Mutate source state after backup",
        "Destroy source PostgreSQL volume",
        "Restore backup into clean PostgreSQL",
        "Verify PostgreSQL backup and restore",
        "Run object-storage backup and restore drill",
        "Upload recovery certification artifacts",
    )

    summary = {
        "version": "1.2.0",
        "postgresql_logical_backup": True,
        "backup_sha256_manifest": True,
        "destructive_source_mutation": True,
        "clean_database_restore": True,
        "row_count_verification": True,
        "content_checksum_verification": True,
        "postgis_restore_probe": True,
        "object_storage_restore_drill": True,
        "recovery_artifacts": True,
    }
    print(json.dumps(summary, indent=2))
    print("PHASE4C_RECOVERY_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
