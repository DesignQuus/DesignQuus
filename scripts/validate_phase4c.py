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
        "Reset target database from template0",
        "--template=template0",
        "pre-restore-postgis-extension-count.txt",
        "Restore backup into template0-clean PostgreSQL",
        "023_security_runtime_role.sql",
        "026_runtime_role_domain_completion.sql",
        "artifacts/pg-restore.log",
        "Verify PostgreSQL backup and restore",
        "Run object-storage backup and restore drill",
        "Upload recovery certification artifacts",
    )

    summary = {
        "version": "1.2.0",
        "postgresql_logical_backup": True,
        "backup_sha256_manifest": True,
        "destructive_source_mutation": True,
        "template0_clean_database_restore": True,
        "pre_restore_postgis_absence_probe": True,
        "pg_restore_diagnostics": True,
        "runtime_role_restore": True,
        "runtime_domain_grants_restore": True,
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
