#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-source-bootstrap-v11}"
OUT="${2:-/tmp/ai-hvac-v11-core-source.zip}"
EXPECTED="e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd"

cat "$ROOT"/part-{001..014}.b64 | base64 -d > "$OUT"
for i in $(seq -w 15 25); do
  cat "$ROOT/part-${i}.bin" >> "$OUT"
done

ACTUAL="$(sha256sum "$OUT" | awk '{print $1}')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "SHA-256 mismatch: $ACTUAL" >&2
  exit 1
fi

echo "SOURCE_ZIP_SHA256_VERIFIED=$ACTUAL"
unzip -q "$OUT" -d /tmp/ai-hvac-v11-source
