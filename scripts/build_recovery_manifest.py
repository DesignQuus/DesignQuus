from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", required=True)
    parser.add_argument("--fingerprint", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    backup = Path(args.backup)
    fingerprint = Path(args.fingerprint)
    output = Path(args.output)

    if not backup.is_file() or backup.stat().st_size == 0:
        raise AssertionError(f"backup file missing or empty: {backup}")
    source_fingerprint = json.loads(fingerprint.read_text(encoding="utf-8"))

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "gitSha": os.environ.get("GIT_SHA", "unknown"),
        "backup": {
            "fileName": backup.name,
            "format": "postgresql-custom",
            "sizeBytes": backup.stat().st_size,
            "sha256": sha256_file(backup),
        },
        "sourceDatabase": {
            "postgresVersion": os.environ.get("POSTGRES_VERSION", "unknown"),
            "postgisVersion": os.environ.get("POSTGIS_VERSION", "unknown"),
        },
        "sourceFingerprint": {
            "fileName": fingerprint.name,
            "sha256": sha256_file(fingerprint),
            "content": source_fingerprint,
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    print("RECOVERY_MANIFEST_CREATED=PASSED")


if __name__ == "__main__":
    main()
