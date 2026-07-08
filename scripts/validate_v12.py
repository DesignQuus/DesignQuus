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
    api_package = json.loads(
        require("apps/api/package.json").read_text(encoding="utf-8")
    )

    assert package["version"] == "1.2.0"
    assert api_package["version"] == "1.2.0"
    assert package["scripts"]["validate:v12"] == "python scripts/validate_v12.py"

    require_text(
        "apps/api/src/main.ts",
        "requestIdMiddleware",
        "enableShutdownHooks",
        "REQUEST_ID_HEADER",
    )
    require_text(
        "apps/api/src/common/request-id.middleware.ts",
        "x-request-id",
        "randomUUID",
        "response.setHeader",
    )
    require_text(
        "apps/api/src/modules/health/health.controller.ts",
        "@Get('live')",
        "@Get('ready')",
        "SELECT 1",
        "ServiceUnavailableException",
        "APP_VERSION",
        "GIT_SHA",
    )
    require_text(
        "compose.yaml",
        "/v1/health/ready",
        "APP_VERSION: 1.2.0",
        "GIT_SHA:",
        "stop_grace_period: 20s",
    )

    summary = {
        "version": "1.2.0",
        "request_id": "configured",
        "liveness": "/v1/health/live",
        "readiness": "/v1/health/ready",
        "database_readiness": "SELECT 1",
        "graceful_shutdown": True,
        "compose_readiness_gate": True,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("V1_2_PRODUCTION_HARDENING_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
