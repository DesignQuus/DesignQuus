from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date
from typing import Any

from space_profile import (
    AttributeCandidate,
    SpaceProfileResolver,
)
from ventilation import (
    VentilationInput,
    calculate_ventilation_flow,
)
from ventilation_rule import VentilationRuleEngine


@dataclass(frozen=True)
class SpaceVentilationPipelineResult:
    status: str
    blockers: list[str]
    profile: dict[str, Any]
    rule_selection: dict[str, Any]
    calculation: dict[str, Any] | None
    selection_requirement: dict[str, Any] | None
    pipeline_version: str = "SPACE_VENTILATION_PIPELINE/0.8.0"

    def to_dict(self) -> dict:
        return asdict(self)


class SpaceVentilationPipeline:
    version = "SPACE_VENTILATION_PIPELINE/0.8.0"

    def __init__(
        self,
        *,
        profile_resolver: SpaceProfileResolver,
        rule_engine: VentilationRuleEngine,
    ):
        self.profile_resolver = profile_resolver
        self.rule_engine = rule_engine

    def run(
        self,
        candidates: list[AttributeCandidate],
        *,
        reference_date: date,
    ) -> SpaceVentilationPipelineResult:
        profile = self.profile_resolver.resolve(
            candidates,
            required_fields=["space_type_code", "area_m2"],
            derive_volume=True,
        )

        if profile.status != "READY":
            blockers = []
            if profile.conflicts:
                blockers.append("SPACE_PROFILE_CONFLICT")
            if profile.missing_fields:
                blockers.append("SPACE_PROFILE_MISSING_FIELDS")

            return SpaceVentilationPipelineResult(
                status="REVIEW_REQUIRED",
                blockers=blockers,
                profile=profile.to_dict(),
                rule_selection={
                    "status": "NOT_RUN",
                    "blockers": [],
                },
                calculation=None,
                selection_requirement=None,
            )

        flat_profile = {
            code: field.value
            for code, field in profile.fields.items()
        }

        selection = self.rule_engine.select(
            flat_profile,
            reference_date=reference_date,
        )

        if selection.status != "SELECTED":
            return SpaceVentilationPipelineResult(
                status="BLOCKED",
                blockers=selection.blockers,
                profile=profile.to_dict(),
                rule_selection=selection.to_dict(),
                calculation=None,
                selection_requirement=None,
            )

        rule = selection.selected_rule
        assert rule is not None

        parameter_map = {
            item["parameter_code"]: item["value_numeric"]
            for item in rule.parameters
        }

        method = rule.calculation_method
        ventilation_input = VentilationInput(
            method=method,
            occupancy_people=_occupancy_for_profile(flat_profile),
            area_m2=_as_float(flat_profile.get("area_m2")),
            volume_m3=_as_float(flat_profile.get("volume_m3")),
            per_person_m3_h=_as_float(
                parameter_map.get("PER_PERSON_M3_H")
            ),
            per_area_m3_h_m2=_as_float(
                parameter_map.get("PER_AREA_M3_H_M2")
            ),
            air_changes_per_hour=_as_float(
                parameter_map.get("AIR_CHANGES_PER_HOUR")
            ),
        )

        missing_input_blocker = _input_blocker(
            method,
            ventilation_input,
        )
        if missing_input_blocker:
            return SpaceVentilationPipelineResult(
                status="BLOCKED",
                blockers=[missing_input_blocker],
                profile=profile.to_dict(),
                rule_selection=selection.to_dict(),
                calculation=None,
                selection_requirement=None,
            )

        calculation = calculate_ventilation_flow(
            ventilation_input
        ).to_dict()

        minimum_flow = _as_float(
            parameter_map.get("MINIMUM_FLOW_M3_H")
        )
        if minimum_flow is not None:
            calculation["raw_required_flow_m3_h"] = (
                calculation["required_flow_m3_h"]
            )
            calculation["required_flow_m3_h"] = max(
                calculation["required_flow_m3_h"],
                minimum_flow,
            )
            calculation["minimum_flow_m3_h"] = minimum_flow

        selection_requirement = {
            "required_flow_m3_h": calculation[
                "required_flow_m3_h"
            ],
            "source_rule_code": rule.rule_code,
            "source_rule_version": rule.version,
            "space_type_code": flat_profile["space_type_code"],
            "pipeline_version": self.version,
        }

        return SpaceVentilationPipelineResult(
            status="READY_FOR_SELECTION",
            blockers=[],
            profile=profile.to_dict(),
            rule_selection=selection.to_dict(),
            calculation=calculation,
            selection_requirement=selection_requirement,
        )


def _occupancy_for_profile(
    profile: dict[str, Any],
) -> float | None:
    value = profile.get("occupancy_design")
    if value is None:
        value = profile.get("occupancy_normal")
    return _as_float(value)


def _as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _input_blocker(
    method: str,
    data: VentilationInput,
) -> str | None:
    if method == "PER_PERSON":
        if (
            data.occupancy_people is None
            or data.per_person_m3_h is None
        ):
            return "VENTILATION_OCCUPANCY_INPUT_MISSING"
    elif method == "PER_AREA":
        if (
            data.area_m2 is None
            or data.per_area_m3_h_m2 is None
        ):
            return "VENTILATION_AREA_INPUT_MISSING"
    elif method == "ACH":
        if (
            data.volume_m3 is None
            or data.air_changes_per_hour is None
        ):
            return "VENTILATION_VOLUME_INPUT_MISSING"
    elif method in {"MAX_OF", "SUM_OF"}:
        available = [
            (
                data.occupancy_people is not None
                and data.per_person_m3_h is not None
            ),
            (
                data.area_m2 is not None
                and data.per_area_m3_h_m2 is not None
            ),
            (
                data.volume_m3 is not None
                and data.air_changes_per_hour is not None
            ),
        ]
        if not any(available):
            return "VENTILATION_INPUT_MISSING"

    return None
