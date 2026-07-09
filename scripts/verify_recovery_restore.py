from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--mutated", required=True)
    parser.add_argument("--restored", required=True)
    parser.add_argument("--backup", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    source_path = Path(args.source)
    mutated_path = Path(args.mutated)
    restored_path = Path(args.restored)
    backup_path = Path(args.backup)
    manifest_path = Path(args.manifest)
    output_path = Path(args.output)

    source = load_json(source_path)
    mutated = load_json(mutated_path)
    restored = load_json(restored_path)
    manifest = load_json(manifest_path)

    if source == mutated:
        raise AssertionError("destructive source mutation did not change the fingerprint")
    if source != restored:
        raise AssertionError(
            "restored database fingerprint differs from the pre-backup source fingerprint"
        )

    actual_backup_sha256 = sha256_file(backup_path)
    expected_backup_sha256 = manifest["backup"]["sha256"]
    if actual_backup_sha256 != expected_backup_sha256:
        raise AssertionError("backup SHA-256 does not match the recovery manifest")

    actual_source_fingerprint_sha256 = sha256_file(source_path)
    expected_source_fingerprint_sha256 = manifest["sourceFingerprint"]["sha256"]
    if actual_source_fingerprint_sha256 != expected_source_fingerprint_sha256:
        raise AssertionError("source fingerprint SHA-256 does not match the manifest")

    required_nonzero_counts = [
        "tenant_count",
        "project_count",
        "retry_policy_count",
        "idempotency_count",
        "outbox_count",
        "dead_letter_count",
        "application_table_count",
    ]
    for key in required_nonzero_counts:
        if int(restored[key]) <= 0:
            raise AssertionError(f"restored fingerprint count is not positive: {key}")

    if float(restored["postgis_area_probe"]) != 50.0:
        raise AssertionError("PostGIS geometry probe did not survive recovery")

    report = {
        "schemaVersion": 1,
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "backupSha256": actual_backup_sha256,
        "backupSizeBytes": backup_path.stat().st_size,
        "sourceFingerprintSha256": actual_source_fingerprint_sha256,
        "sourceMutationDetected": True,
        "sourceRestoredExactly": True,
        "rowCountsVerified": True,
        "contentChecksumsVerified": True,
        "postgisProbeVerified": True,
        "status": "PASSED",
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    print("POSTGRESQL_BACKUP_RESTORE_CERTIFICATION=PASSED")


if __name__ == "__main__":
    main()
