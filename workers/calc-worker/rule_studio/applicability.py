from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
from typing import Any

from ventilation_rule.engine import VentilationRuleSet


@dataclass(frozen=True)
class ApplicabilityResult:
    rule_code: str
    status: str
    matched_conditions: list[dict[str, Any]]
    failed_conditions: list[dict[str, Any]]
    missing_inputs: list[str]
    evidence: dict[str, Any]

    def to_dict(self) -> dict:
        return asdict(self)


class ProjectApplicabilityAnalyzer:
    version = "PROJECT_APPLICABILITY/0.9.0"

    def analyze(
        self,
        rules: list[VentilationRuleSet],
        context: dict[str, Any],
        *,
        reference_date: date,
    ) -> list[ApplicabilityResult]:
        return [
            self._analyze_one(rule, context, reference_date)
            for rule in rules
        ]

    def _analyze_one(
        self,
        rule: VentilationRuleSet,
        context: dict[str, Any],
        reference_date: date,
    ) -> ApplicabilityResult:
        effective = (
            rule.effective_from <= reference_date
            and (
                rule.effective_to is None
                or reference_date <= rule.effective_to
            )
        )

        if not effective:
            return ApplicabilityResult(
                rule_code=rule.rule_code,
                status="NOT_APPLICABLE",
                matched_conditions=[],
                failed_conditions=[],
                missing_inputs=[],
                evidence={
                    "reason": "OUTSIDE_EFFECTIVE_DATE",
                    "reference_date": reference_date.isoformat(),
                },
            )

        matched = []
        failed = []
        missing = []

        for condition in rule.conditions:
            field = condition["field"]
            if field not in context or context.get(field) is None:
                missing.append(field)
                continue

            actual = context[field]
            if _matches(actual, condition):
                matched.append({
                    "field": field,
                    "actual": actual,
                    "condition": condition,
                })
            else:
                failed.append({
                    "field": field,
                    "actual": actual,
                    "condition": condition,
                })

        if missing:
            status = "REVIEW_REQUIRED"
        elif failed:
            status = "NOT_APPLICABLE"
        else:
            status = "APPLICABLE"

        if (
            rule.rule_status != "APPROVED"
            or rule.source_status != "CONTENT_VERIFIED"
        ):
            status = "BLOCKED"

        return ApplicabilityResult(
            rule_code=rule.rule_code,
            status=status,
            matched_conditions=matched,
            failed_conditions=failed,
            missing_inputs=sorted(set(missing)),
            evidence={
                "reference_date": reference_date.isoformat(),
                "rule_version": rule.version,
                "source_code": rule.source_code,
            },
        )


def _matches(actual: Any, condition: dict[str, Any]) -> bool:
    op = condition["operator"]
    expected = condition.get("value")

    if op == "eq":
        return actual == expected
    if op == "in":
        return actual in expected
    if op == "gte":
        return actual >= expected
    if op == "lte":
        return actual <= expected
    if op == "exists":
        return (actual is not None) is bool(expected)
    raise ValueError(f"Unsupported operator: {op}")
