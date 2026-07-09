from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(root: Path) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        objects.append(
            {
                "path": path.relative_to(root).as_posix(),
                "sizeBytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )
    return objects


def safe_extract(archive: Path, destination: Path) -> None:
    destination_root = destination.resolve()
    with tarfile.open(archive, "r:gz") as handle:
        for member in handle.getmembers():
            target = (destination / member.name).resolve()
            if not target.is_relative_to(destination_root):
                raise AssertionError(f"unsafe archive path: {member.name}")
        handle.extractall(destination)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--artifacts-dir", required=True)
    args = parser.parse_args()

    work_dir = Path(args.work_dir)
    artifacts_dir = Path(args.artifacts_dir)
    source = work_dir / "object-source"
    restored = work_dir / "object-restored"
    archive = artifacts_dir / "object-storage-backup.tar.gz"
    backup_manifest_path = artifacts_dir / "object-storage-backup-manifest.json"
    restore_report_path = artifacts_dir / "object-storage-restore-report.json"

    shutil.rmtree(work_dir, ignore_errors=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    fixtures = {
        "drawings/project-A/plan-A.pdf": b"AI-HVAC-PDF-RECOVERY-FIXTURE\npage=1\n",
        "cad/project-A/source.dxf": b"0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n",
        "catalog/erv/model-100.json": json.dumps(
            {
                "manufacturer": "Recovery Fixture",
                "model": "ERV-100",
                "airflowM3h": 1000,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8"),
        "approvals/project-A/expert-approval.txt": b"status=APPROVED\nrevision=1\n",
    }

    for relative_path, content in fixtures.items():
        target = source / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    source_inventory = inventory(source)
    if len(source_inventory) != len(fixtures):
        raise AssertionError("object-storage fixture inventory is incomplete")

    with tarfile.open(archive, "w:gz") as handle:
        for item in source_inventory:
            handle.add(source / item["path"], arcname=item["path"], recursive=False)

    backup_manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "archive": {
            "fileName": archive.name,
            "sizeBytes": archive.stat().st_size,
            "sha256": sha256_file(archive),
        },
        "objectCount": len(source_inventory),
        "objects": source_inventory,
    }
    backup_manifest_path.write_text(
        json.dumps(backup_manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    shutil.rmtree(source)
    if source.exists():
        raise AssertionError("source object storage was not removed before restore")

    restored.mkdir(parents=True, exist_ok=True)
    safe_extract(archive, restored)
    restored_inventory = inventory(restored)

    if source_inventory != restored_inventory:
        raise AssertionError("restored object inventory differs from backup manifest")

    restore_report = {
        "schemaVersion": 1,
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "archiveSha256": backup_manifest["archive"]["sha256"],
        "sourceRemovedBeforeRestore": True,
        "objectCount": len(restored_inventory),
        "pathsVerified": True,
        "sizesVerified": True,
        "sha256Verified": True,
        "status": "PASSED",
    }
    restore_report_path.write_text(
        json.dumps(restore_report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(restore_report, indent=2, sort_keys=True))
    print("OBJECT_STORAGE_BACKUP_RESTORE_CERTIFICATION=PASSED")


if __name__ == "__main__":
    main()
