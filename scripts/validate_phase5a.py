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
    budgets = json.loads(
        require("config/performance-budgets.v1.2.json").read_text(encoding="utf-8")
    )

    assert package["version"] == "1.2.0"
    assert budgets["policyVersion"] == "1.2.0"
    assert budgets["global"]["maxErrorRate"] == 0.0

    expected_scenarios = {
        "health_live",
        "health_ready",
        "reliability_read",
        "reliability_write",
        "db_pool_saturation",
        "calculation_throughput",
        "selection_throughput",
        "drawing_review_read",
        "drawing_upload",
    }
    assert set(budgets["scenarios"]) == expected_scenarios

    for name, budget in budgets["scenarios"].items():
        assert budget["requests"] > 0, name
        assert budget["concurrency"] > 0, name
        assert budget["p95MsMax"] > 0, name
        assert budget["p99MsMax"] >= budget["p95MsMax"], name
        assert budget["minThroughputRps"] > 0, name

    require_text(
        "scripts/performance_fixture.sql",
        "PERFORMANCE_FIXTURE_READY",
        "PERF-PROJECT-001",
        "REVIEW_REQUIRED",
        "PERFORMANCE_READ",
        "generate_series(100, 149)",
    )
    require_text(
        "scripts/performance_baseline.py",
        "ThreadPoolExecutor",
        "p95",
        "p99",
        "throughputRps",
        "reliability_write",
        "db_pool_saturation",
        "calculation_throughput",
        "selection_throughput",
        "drawing_review_read",
        "drawing_upload",
        "PHASE5A_PERFORMANCE_BASELINE=PASSED",
    )
    require_text(
        "scripts/performance_db_report.sql",
        "ervDesignRunCount",
        "idempotencyRecordCount",
        "uploadedFileCount",
        "numBackends",
        "xactCommit",
    )
    require_text(
        ".github/workflows/performance-phase5a.yml",
        "Load performance fixture",
        "Run Phase 5A performance baseline",
        "Capture database performance report",
        "Upload Phase 5A performance artifacts",
    )

    summary = {
        "version": "1.2.0",
        "budgetPolicyVersion": budgets["policyVersion"],
        "scenarioCount": len(expected_scenarios),
        "latencyPercentiles": ["p50", "p95", "p99"],
        "throughputBudget": True,
        "zeroErrorBudget": True,
        "healthConcurrency": True,
        "authenticatedReadWrite": True,
        "drawingUploadReview": True,
        "calculationSelection": True,
        "dbPoolSaturation": True,
        "performanceArtifacts": True,
    }
    print(json.dumps(summary, indent=2))
    print("PHASE5A_PERFORMANCE_VALIDATION=PASSED")


if __name__ == "__main__":
    main()
