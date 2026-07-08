from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
from typing import Any
import time

from ventilation_rule.engine import (
    VentilationRuleEngine,
    VentilationRuleSet,
)


@dataclass(frozen=True)
class RuleTestCase:
    case_no: int
    case_name: str
    input_json: dict[str, Any]
    expected_json: dict[str, Any]
    required: bool = True


@dataclass(frozen=True)
class RuleTestCaseResult:
    case_no: int
    case_name: str
    status: str
    actual_json: dict[str, Any] | None
    diff_json: dict[str, Any] | None
    error_message: str | None
    duration_ms: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class RuleTestRunResult:
    status: str
    total_count: int
    passed_count: int
    failed_count: int
    error_count: int
    results: list[RuleTestCaseResult]
    engine_version: str = "RULE_TEST_RUNNER/0.9.0"

    def to_dict(self) -> dict:
        return {
            **asdict(self),
            "results": [x.to_dict() for x in self.results],
        }


class RuleTestRunner:
    version = "RULE_TEST_RUNNER/0.9.0"

    def run(
        self,
        rule: VentilationRuleSet,
        cases: list[RuleTestCase],
        *,
        reference_date: date,
    ) -> RuleTestRunResult:
        engine = VentilationRuleEngine([rule])
        results: list[RuleTestCaseResult] = []

        for case in cases:
            started = time.perf_counter()
            try:
                selection = engine.select(
                    case.input_json,
                    reference_date=reference_date,
                )
                actual = {
                    "applicable": selection.status == "SELECTED",
                    "status": selection.status,
                    "blockers": selection.blockers,
                    "calculation_method": (
                        selection.selected_rule.calculation_method
                        if selection.selected_rule else None
                    ),
                    "rule_code": (
                        selection.selected_rule.rule_code
                        if selection.selected_rule else None
                    ),
                }
                diff = _diff(case.expected_json, actual)
                status = "PASSED" if not diff else "FAILED"
                error = None
            except Exception as exc:
                actual = None
                diff = None
                status = "ERROR"
                error = str(exc)

            duration_ms = int((time.perf_counter() - started) * 1000)
            results.append(RuleTestCaseResult(
                case_no=case.case_no,
                case_name=case.case_name,
                status=status,
                actual_json=actual,
                diff_json=diff,
                error_message=error,
                duration_ms=duration_ms,
            ))

        passed = sum(1 for x in results if x.status == "PASSED")
        failed = sum(1 for x in results if x.status == "FAILED")
        errors = sum(1 for x in results if x.status == "ERROR")

        overall = "PASSED" if failed == 0 and errors == 0 else "FAILED"
        return RuleTestRunResult(
            status=overall,
            total_count=len(results),
            passed_count=passed,
            failed_count=failed,
            error_count=errors,
            results=results,
        )


def _diff(expected: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any]:
    diff: dict[str, Any] = {}
    for key, expected_value in expected.items():
        actual_value = actual.get(key)
        if actual_value != expected_value:
            diff[key] = {
                "expected": expected_value,
                "actual": actual_value,
            }
    return diff
