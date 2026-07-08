# Clean Restart Required for v1.1 Source Transfer

During local verification, the source ZIP was re-encoded and split with a fixed 10,000-character Base64 chunk size.

The correct clean split is:

```text
Base64 chars: 241,420
Chunk size: 10,000
Total chunks: 25
```

Earlier uploaded parts 001-008 were created during a mixed 20KB/10KB transfer attempt. To avoid corrupting the ZIP, do not continue from the existing mixed sequence.

## Safe path

1. Delete or ignore the current `source-bootstrap-v11/part-*.b64` files.
2. Re-upload the clean 25-part set from the local package:

```text
ai-hvac-engineering-os-full-source-v1.1-transfer.zip
```

3. Concatenate in lexical order.
4. Decode to `ai-hvac-v11-core-source.zip`.
5. Verify SHA-256:

```text
e119224c5786d761637dc466987f41b6db635a402b1a5ccb5ba86fba0101fcdd
```

6. Hydrate source tree.
7. Run full CI gates.

## Current state

```text
v1.0.2 GitHub Runtime Bootstrap: PASSED
v1.1 Full Source Transfer: INCOMPLETE — CLEAN RESTART REQUIRED
```
