#!/usr/bin/env bash
set -euo pipefail

EXPECTED_SHA256="e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd"
PART_DIR="source-bootstrap-v11"
OUT_ZIP="ai-hvac-v11-core-source.zip"
OUT_DIR="ai-hvac-full-source"

missing=0
for i in $(seq -w 1 24); do
  part="$PART_DIR/part-${i}.b64"
  if [ ! -f "$part" ]; then
    echo "MISSING: $part" >&2
    missing=1
  fi
done

if [ "$missing" = "1" ]; then
  echo "Cannot hydrate: not all 24 parts are present." >&2
  exit 1
fi

cat "$PART_DIR"/part-*.b64 > "$PART_DIR/core-source.b64"
base64 -d "$PART_DIR/core-source.b64" > "$OUT_ZIP"

echo "$EXPECTED_SHA256  $OUT_ZIP" | sha256sum -c -

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
unzip -q "$OUT_ZIP" -d "$OUT_DIR"

find "$OUT_DIR" -type f | sort > "$PART_DIR/hydrated-file-list.txt"
wc -l "$PART_DIR/hydrated-file-list.txt"

echo "AI_HVAC_V11_CORE_SOURCE_HYDRATED"
