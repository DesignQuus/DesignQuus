from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path
from typing import Any
import json


@dataclass(frozen=True)
class VentilationRuleSet:
    rule_code: str
    version: int
    name: str
    source_code: str
    source_status: str
    rule_status: str
    effective_from: date
    effective_to: date | None
    priority: int
    conditions: list[dict[str, Any]]
    calculation_method: str
    parameters: list[dict[str, Any]]

    @classmethod
    def from_dict(cls, value: dict) -> "VentilationRuleSet":
        return cls(
            rule_code=value["rule_code"],
            version=int(value["version"]),
            name=value["name"],
            source_code=value["source_code"],
            source_status=value["source_status"],
            rule_status=value["rule_status"],
            effective_from=date.fromisoformat(value["effective_from"]),
            effective_to=(
                date.fromisoformat(value["effective_to"])
                if value.get("effective_to")
                else None
            ),
            priority=int(value.get("priority", 100)),
            conditions=list(value.get("conditions", [])),
            calculation_method=value["calculation_method"],
            parameters=list(value.get("parameters", [])),
        )


@dataclass(frozen=True)
class RuleSelectionResult:
    status: str
    selected_rule: VentilationRuleSet | None
    blockers: list[str]
    evaluated_rules: list[dict[str, Any]]
    engine_version: str = "VENTILATION_RULE_ENGINE/0.8.0"

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "selected_rule": (
                asdict(self.selected_rule)
                if self.selected_rule else None
            ),
            "blockers": self.blockers,
            "evaluated_rules": self.evaluated_rules,
            "engine_version": self.engine_version,
        }


class VentilationRuleEngine:
    version = "VENTILATION_RULE_ENGINE/0.8.0"

    def __init__(self, rules: list[VentilationRuleSet]):
        self.rules = rules

    @classmethod
    def from_json(cls, path: str | Path) -> "VentilationRuleEngine":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls([
            VentilationRuleSet.from_dict(item)
            for item in data["rule_sets"]
        ])

    def select(
        self,
        profile: dict[str, Any],
        *,
        reference_date: date,
    ) -> RuleSelectionResult:
        evaluated: list[dict[str, Any]] = []
        applicable: list[VentilationRuleSet] = []
        unverified_applicable = False

        for rule in self.rules:
            effective = (
                rule.effective_from <= reference_date
                and (
                    rule.effective_to is None
                    or reference_date <= rule.effective_to
                )
            )
            condition_match = (
                effective
                and all(
                    _condition_matches(profile, condition)
                    for condition in rule.conditions
                )
            )

            evaluated.append({
                "rule_code": rule.rule_code,
                "effective": effective,
                "condition_match": condition_match,
                "rule_status": rule.rule_status,
                "source_status": rule.source_status,
            })

            if not condition_match:
                continue

            if (
                rule.rule_status != "APPROVED"
                or rule.source_status != "CONTENT_VERIFIED"
            ):
                unverified_applicable = True
                continue

            if not _parameters_verified(rule.parameters):
                unverified_applicable = True
                continue

            applicable.append(rule)

        if applicable:
            selected = sorted(
                applicable,
                key=lambda r: (r.priority, r.version),
                reverse=True,
            )[0]
            return RuleSelectionResult(
                status="SELECTED",
                selected_rule=selected,
                blockers=[],
                evaluated_rules=evaluated,
            )

        blockers = []
        if unverified_applicable:
            blockers.append("VENTILATION_PARAMETER_UNVERIFIED")
        else:
            blockers.append("VENTILATION_RULE_NOT_FOUND")

        return RuleSelectionResult(
            status="BLOCKED",
            selected_rule=None,
            blockers=blockers,
            evaluated_rules=evaluated,
        )


def _condition_matches(
    profile: dict[str, Any],
    condition: dict[str, Any],
) -> bool:
    field = condition["field"]
    operator = condition["operator"]
    expected = condition.get("value")
    actual = profile.get(field)

    if operator == "eq":
        return actual == expected
    if operator == "in":
        return actual in expected
    if operator == "gte":
        return actual is not None and actual >= expected
    if operator == "lte":
        return actual is not None and actual <= expected
    if operator == "exists":
        return (actual is not None) is bool(expected)

    raise ValueError(f"Unsupported operator: {operator}")


def _parameters_verified(parameters: list[dict[str, Any]]) -> bool:
    if not parameters:
        return False
    return all(
        parameter.get("verification_status") == "VERIFIED"
        for parameter in parameters
    )
