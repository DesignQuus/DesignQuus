from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
from typing import Any


SUPPORTED_OPERATORS = {"eq", "in", "gte", "lte", "exists"}
SUPPORTED_METHODS = {"PER_PERSON", "PER_AREA", "ACH", "MAX_OF", "SUM_OF"}
SUPPORTED_PARAMETERS = {
    "PER_PERSON_M3_H",
    "PER_AREA_M3_H_M2",
    "AIR_CHANGES_PER_HOUR",
    "MINIMUM_FLOW_M3_H",
}


@dataclass(frozen=True)
class RuleCompileResult:
    status: str
    errors: list[dict[str, Any]]
    warnings: list[dict[str, Any]]
    normalized_rule: dict[str, Any] | None
    compiler_version: str = "VENTILATION_RULE_COMPILER/0.9.0"

    def to_dict(self) -> dict:
        return asdict(self)


class RuleCompiler:
    version = "VENTILATION_RULE_COMPILER/0.9.0"

    def compile(
        self,
        draft: dict[str, Any],
        *,
        source_status: str,
    ) -> RuleCompileResult:
        errors: list[dict[str, Any]] = []
        warnings: list[dict[str, Any]] = []

        required = [
            "rule_code", "name", "source_code", "source_clause",
            "effective_from", "priority", "legal_effect",
            "conditions", "calculation_method", "parameters",
        ]
        for field in required:
            if field not in draft:
                errors.append({
                    "code": "REQUIRED_FIELD_MISSING",
                    "field": field,
                })

        if errors:
            return RuleCompileResult(
                status="COMPILE_FAILED",
                errors=errors,
                warnings=warnings,
                normalized_rule=None,
            )

        try:
            effective_from = date.fromisoformat(draft["effective_from"])
            effective_to = (
                date.fromisoformat(draft["effective_to"])
                if draft.get("effective_to")
                else None
            )
            if effective_to and effective_to < effective_from:
                errors.append({
                    "code": "INVALID_EFFECTIVE_DATE_RANGE",
                })
        except ValueError as exc:
            errors.append({
                "code": "INVALID_DATE",
                "message": str(exc),
            })

        method = draft["calculation_method"]
        if method not in SUPPORTED_METHODS:
            errors.append({
                "code": "UNSUPPORTED_CALCULATION_METHOD",
                "value": method,
            })

        for i, condition in enumerate(draft["conditions"]):
            operator = condition.get("operator")
            field = condition.get("field")
            if not field:
                errors.append({
                    "code": "CONDITION_FIELD_MISSING",
                    "index": i,
                })
            if operator not in SUPPORTED_OPERATORS:
                errors.append({
                    "code": "UNSUPPORTED_OPERATOR",
                    "index": i,
                    "value": operator,
                })
            if operator != "exists" and "value" not in condition:
                errors.append({
                    "code": "CONDITION_VALUE_MISSING",
                    "index": i,
                })

        parameters = draft["parameters"]
        if not parameters:
            errors.append({"code": "PARAMETER_REQUIRED"})

        seen = set()
        for i, parameter in enumerate(parameters):
            code = parameter.get("parameter_code")
            if code not in SUPPORTED_PARAMETERS:
                errors.append({
                    "code": "UNSUPPORTED_PARAMETER",
                    "index": i,
                    "value": code,
                })
            if code in seen:
                errors.append({
                    "code": "DUPLICATE_PARAMETER",
                    "index": i,
                    "value": code,
                })
            seen.add(code)

            value = parameter.get("value_numeric")
            if not isinstance(value, (int, float)) or value < 0:
                errors.append({
                    "code": "INVALID_PARAMETER_VALUE",
                    "index": i,
                })

            if not parameter.get("unit"):
                errors.append({
                    "code": "PARAMETER_UNIT_MISSING",
                    "index": i,
                })

            if not parameter.get("source_clause"):
                errors.append({
                    "code": "PARAMETER_SOURCE_CLAUSE_MISSING",
                    "index": i,
                })

            if parameter.get("verification_status") != "VERIFIED":
                warnings.append({
                    "code": "PARAMETER_NOT_VERIFIED",
                    "index": i,
                    "parameter_code": code,
                })

        if source_status != "CONTENT_VERIFIED":
            warnings.append({
                "code": "SOURCE_CONTENT_NOT_VERIFIED",
                "source_status": source_status,
            })

        status = "COMPILED" if not errors else "COMPILE_FAILED"
        normalized = None
        if not errors:
            normalized = {
                **draft,
                "priority": int(draft["priority"]),
                "conditions": list(draft["conditions"]),
                "parameters": list(draft["parameters"]),
            }

        return RuleCompileResult(
            status=status,
            errors=errors,
            warnings=warnings,
            normalized_rule=normalized,
        )
