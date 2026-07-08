# AI HVAC v1.1 segmented source recovery

Canonical ZIP SHA-256: `e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd`

Recovery layout:

- `part-001.b64` through `part-014.b64`: UTF-8 Base64 text chunks, 10,000 chars each.
- `part-015.bin` through `part-025.bin`: raw binary segments decoded from the corresponding Base64 chunks.

Because every Base64 chunk boundary is a multiple of 4 characters, recovery is byte-exact:

```bash
cat source-bootstrap-v11/part-{001..014}.b64 | base64 -d > /tmp/ai-hvac-v11-core-source.zip
for i in $(seq -w 15 25); do
  cat "source-bootstrap-v11/part-${i}.bin" >> /tmp/ai-hvac-v11-core-source.zip
done
sha256sum /tmp/ai-hvac-v11-core-source.zip
```

Expected SHA-256:

```text
e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd
```

The source archive contains 227 runtime-core files and expands into the repository root for full-source certification.
