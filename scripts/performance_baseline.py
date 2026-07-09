from __future__ import annotations

import argparse
import json
import math
import os
import platform
import statistics
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3001/v1").rstrip("/")
AUTH_SHARED_SECRET = os.environ.get("AUTH_SHARED_SECRET", "")
TENANT_ID = "90000000-0000-7000-8000-000000000000"
PROJECT_ID = "90000000-0000-7000-8000-000000000001"
PROJECT_REVISION_ID = "90000000-0000-7000-8000-000000000002"
SOURCE_FILE_VERSION_ID = "90000000-0000-7000-8000-000000000004"
IMPORT_JOB_ID = "90000000-0000-7000-8000-000000000005"


@dataclass(frozen=True)
class Response:
    status: int
    body: bytes


class RequestFailure(Exception):
    pass


def auth_headers(role: str = "ENGINEER", user_id: str = "phase5a-perf") -> dict[str, str]:
    return {
        "x-auth-secret": AUTH_SHARED_SECRET,
        "x-user-id": user_id,
        "x-user-role": role,
        "x-tenant-id": TENANT_ID,
    }


def http_request(
    method: str,
    path: str,
    *,
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 20.0,
) -> Response:
    request_headers = {
        "x-request-id": f"phase5a-{uuid.uuid4()}",
        "connection": "close",
    }
    request_headers.update(headers or {})
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return Response(response.status, response.read())
    except urllib.error.HTTPError as error:
        return Response(error.code, error.read())


def json_request(
    method: str,
    path: str,
    payload: Any | None,
    *,
    role: str = "ENGINEER",
    user_id: str = "phase5a-perf",
) -> Response:
    body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = auth_headers(role, user_id)
    headers["content-type"] = "application/json"
    return http_request(method, path, body=body, headers=headers)


def encode_multipart(
    fields: dict[str, str],
    filename: str,
    file_content: bytes,
) -> tuple[bytes, str]:
    boundary = f"----ai-hvac-phase5a-{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                value.encode(),
                b"\r\n",
            ]
        )
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
            b"Content-Type: application/pdf\r\n\r\n",
            file_content,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), boundary


def percentile(values: list[float], percentile_value: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = max(1, math.ceil((percentile_value / 100.0) * len(ordered)))
    return ordered[min(rank - 1, len(ordered) - 1)]


def run_scenario(
    name: str,
    config: dict[str, Any],
    operation: Callable[[int], Response],
    expected_statuses: set[int],
    max_error_rate: float,
) -> dict[str, Any]:
    requests = int(config["requests"])
    concurrency = int(config["concurrency"])
    latencies_ms: list[float] = []
    errors: list[dict[str, Any]] = []
    statuses: dict[str, int] = {}

    for index in range(min(3, requests)):
        response = operation(-(index + 1))
        if response.status not in expected_statuses:
            raise RequestFailure(
                f"{name} warmup failed with HTTP {response.status}: {response.body[:300]!r}"
            )

    wall_started = time.perf_counter()

    def invoke(index: int) -> tuple[float, Response]:
        started = time.perf_counter()
        response = operation(index)
        return (time.perf_counter() - started) * 1000.0, response

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = {executor.submit(invoke, index): index for index in range(requests)}
        for future in as_completed(futures):
            index = futures[future]
            try:
                latency_ms, response = future.result()
                latencies_ms.append(latency_ms)
                status_key = str(response.status)
                statuses[status_key] = statuses.get(status_key, 0) + 1
                if response.status not in expected_statuses:
                    errors.append(
                        {
                            "index": index,
                            "status": response.status,
                            "body": response.body[:500].decode("utf-8", errors="replace"),
                        }
                    )
            except Exception as error:  # noqa: BLE001
                errors.append({"index": index, "exception": repr(error)})

    wall_seconds = max(time.perf_counter() - wall_started, 0.000001)
    error_rate = len(errors) / requests
    throughput_rps = requests / wall_seconds
    metrics = {
        "requests": requests,
        "concurrency": concurrency,
        "completed": len(latencies_ms),
        "successes": requests - len(errors),
        "errors": len(errors),
        "errorRate": round(error_rate, 6),
        "statuses": statuses,
        "wallSeconds": round(wall_seconds, 6),
        "throughputRps": round(throughput_rps, 3),
        "latencyMs": {
            "min": round(min(latencies_ms), 3) if latencies_ms else 0.0,
            "mean": round(statistics.fmean(latencies_ms), 3) if latencies_ms else 0.0,
            "p50": round(percentile(latencies_ms, 50), 3),
            "p95": round(percentile(latencies_ms, 95), 3),
            "p99": round(percentile(latencies_ms, 99), 3),
            "max": round(max(latencies_ms), 3) if latencies_ms else 0.0,
        },
    }
    checks = {
        "errorRate": error_rate <= max_error_rate,
        "p95Ms": metrics["latencyMs"]["p95"] <= float(config["p95MsMax"]),
        "p99Ms": metrics["latencyMs"]["p99"] <= float(config["p99MsMax"]),
        "throughputRps": throughput_rps >= float(config["minThroughputRps"]),
    }
    metrics["budget"] = {
        "limits": {
            "maxErrorRate": max_error_rate,
            "p95MsMax": config["p95MsMax"],
            "p99MsMax": config["p99MsMax"],
            "minThroughputRps": config["minThroughputRps"],
        },
        "checks": checks,
        "status": "PASSED" if all(checks.values()) else "FAILED",
    }
    if errors:
        metrics["errorSamples"] = errors[:5]
    print(json.dumps({name: metrics}, indent=2))
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budgets", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    budgets = json.loads(Path(args.budgets).read_text(encoding="utf-8"))
    scenarios = budgets["scenarios"]
    max_error_rate = float(budgets["global"]["maxErrorRate"])
    if not AUTH_SHARED_SECRET:
        raise AssertionError("AUTH_SHARED_SECRET is required")

    minimal_pdf = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n"
        b"trailer<</Root 1 0 R>>\n%%EOF\n"
    )

    def reliability_write(index: int) -> Response:
        unique = f"{index}-{uuid.uuid4().hex}"
        return json_request(
            "POST",
            "/reliability/idempotency/reservations",
            {
                "scope": "PERFORMANCE_WRITE",
                "idempotencyKey": f"phase5a-write-{unique}",
                "requestPayload": {"sequence": index, "token": unique},
                "ttlSeconds": 3600,
            },
            role="ENGINEER",
            user_id="phase5a-reliability-write",
        )

    def drawing_upload(index: int) -> Response:
        encoded, boundary = encode_multipart(
            {
                "projectId": PROJECT_ID,
                "projectRevisionId": PROJECT_REVISION_ID,
                "fileType": "PDF",
            },
            f"phase5a-{index}-{uuid.uuid4().hex}.pdf",
            minimal_pdf,
        )
        return http_request(
            "POST",
            "/files/upload",
            body=encoded,
            headers={
                **auth_headers("ENGINEER", "phase5a-upload"),
                "content-type": f"multipart/form-data; boundary={boundary}",
                "idempotency-key": f"phase5a-upload-{index}-{uuid.uuid4().hex}",
            },
            timeout=30.0,
        )

    scenario_operations: dict[str, tuple[Callable[[int], Response], set[int]]] = {
        "health_live": (lambda _index: http_request("GET", "/health/live"), {200}),
        "health_ready": (lambda _index: http_request("GET", "/health/ready"), {200}),
        "reliability_read": (
            lambda _index: json_request(
                "GET",
                "/reliability/idempotency/PERFORMANCE_READ/performance-read-001",
                None,
                role="APPROVER",
            ),
            {200},
        ),
        "reliability_write": (reliability_write, {201}),
        "db_pool_saturation": (
            lambda _index: json_request(
                "GET",
                "/reliability/idempotency/PERFORMANCE_READ/performance-read-001",
                None,
                role="APPROVER",
                user_id="phase5a-db-saturation",
            ),
            {200},
        ),
        "calculation_throughput": (
            lambda index: json_request(
                "POST",
                "/space-ventilation/runs",
                {
                    "scenario": "phase5a",
                    "sequence": index,
                    "areaM2": 125.5,
                    "occupancy": 12,
                },
            ),
            {201},
        ),
        "selection_throughput": (
            lambda _index: json_request(
                "POST",
                "/erv-design-runs",
                {
                    "projectId": PROJECT_ID,
                    "projectRevisionId": PROJECT_REVISION_ID,
                    "sourceFileVersionId": SOURCE_FILE_VERSION_ID,
                },
            ),
            {201},
        ),
        "drawing_review_read": (
            lambda _index: json_request(
                "GET",
                f"/import-jobs/{IMPORT_JOB_ID}/extractions",
                None,
                role="ENGINEER",
            ),
            {200},
        ),
        "drawing_upload": (drawing_upload, {201}),
    }

    report: dict[str, Any] = {
        "schemaVersion": 1,
        "policyVersion": budgets["policyVersion"],
        "environment": budgets["environment"],
        "gitSha": os.environ.get("GIT_SHA", "unknown"),
        "baseUrl": BASE_URL,
        "runtime": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processorCount": os.cpu_count(),
        },
        "startedAtEpoch": time.time(),
        "scenarios": {},
    }

    all_passed = True
    suite_started = time.perf_counter()
    for name in scenarios:
        if name not in scenario_operations:
            raise AssertionError(f"No performance operation is defined for scenario: {name}")
        operation, expected_statuses = scenario_operations[name]
        result = run_scenario(
            name,
            scenarios[name],
            operation,
            expected_statuses,
            max_error_rate,
        )
        report["scenarios"][name] = result
        all_passed = all_passed and result["budget"]["status"] == "PASSED"

    metrics_response = http_request("GET", "/metrics")
    report["metricsSnapshot"] = metrics_response.body.decode("utf-8", errors="replace")[:20000]
    report["suiteWallSeconds"] = round(time.perf_counter() - suite_started, 6)
    report["status"] = "PASSED" if all_passed else "FAILED"

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "status": report["status"],
                "suiteWallSeconds": report["suiteWallSeconds"],
                "scenarios": {
                    name: {
                        "p95Ms": value["latencyMs"]["p95"],
                        "p99Ms": value["latencyMs"]["p99"],
                        "throughputRps": value["throughputRps"],
                        "errorRate": value["errorRate"],
                        "budget": value["budget"]["status"],
                    }
                    for name, value in report["scenarios"].items()
                },
            },
            indent=2,
        )
    )

    if not all_passed:
        raise SystemExit("PHASE5A_PERFORMANCE_BASELINE=FAILED")
    print("PHASE5A_PERFORMANCE_BASELINE=PASSED")


if __name__ == "__main__":
    main()
