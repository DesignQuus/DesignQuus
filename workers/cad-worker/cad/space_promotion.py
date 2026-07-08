from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class SpacePromotionInput:
    room_candidate_id: str
    room_status: str
    unit_status: str
    space_code: str
    room_name: str | None
    space_type_code: str
    area_m2: float
    geometry_geojson: dict[str, Any] | None
    geometry_quality_status: str
    auto_promotable: bool
    ai_cad_match_decision: str | None = None
    require_ai_cad_match: bool = False


@dataclass(frozen=True)
class SpacePromotionPlan:
    room_candidate_id: str
    decision: str
    blockers: list[str]
    proposed_space_code: str
    proposed_space_name: str
    proposed_space_type_code: str
    area_m2: float
    geometry_geojson: dict[str, Any] | None
    geometry_coordinate_space: str
    geometry_source: str
    area_source: str
    geometry_quality_status: str
    evidence: dict[str, Any]

    def to_dict(self) -> dict:
        return asdict(self)


class SpacePromotionPlanner:
    version = "SPACE_PROMOTION_PLANNER/0.7.0"

    valid_unit_statuses = {"VALIDATED", "USER_CONFIRMED"}
    valid_room_statuses = {"ACCEPTED"}
    valid_geometry_statuses = {"VALID", "REPAIRED_SINGLE"}

    def plan(
        self,
        data: SpacePromotionInput,
    ) -> SpacePromotionPlan:
        blockers: list[str] = []

        if data.unit_status not in self.valid_unit_statuses:
            blockers.append("UNIT_NOT_VALIDATED")

        if data.room_status not in self.valid_room_statuses:
            blockers.append("ROOM_NOT_ACCEPTED")

        if (
            data.geometry_quality_status
            not in self.valid_geometry_statuses
            or not data.auto_promotable
        ):
            blockers.append("GEOMETRY_NOT_AUTOPROMOTABLE")

        if not data.room_name or not data.room_name.strip():
            blockers.append("ROOM_NAME_MISSING")

        if data.area_m2 <= 0:
            blockers.append("AREA_INVALID")

        if data.geometry_geojson is None:
            blockers.append("GEOMETRY_MISSING")

        if data.require_ai_cad_match:
            if data.ai_cad_match_decision != "AUTO_MATCH":
                blockers.append("AI_CAD_MATCH_AMBIGUOUS")

        if blockers:
            decision = (
                "REVIEW_REQUIRED"
                if set(blockers).issubset({
                    "ROOM_NAME_MISSING",
                    "AI_CAD_MATCH_AMBIGUOUS",
                })
                else "BLOCKED"
            )
        else:
            decision = "READY"

        return SpacePromotionPlan(
            room_candidate_id=data.room_candidate_id,
            decision=decision,
            blockers=blockers,
            proposed_space_code=data.space_code,
            proposed_space_name=(data.room_name or "").strip(),
            proposed_space_type_code=data.space_type_code,
            area_m2=round(data.area_m2, 6),
            geometry_geojson=data.geometry_geojson,
            geometry_coordinate_space="MODEL_LOCAL_M",
            geometry_source="CAD_ROOM_CANDIDATE",
            area_source="EXACT_CAD_GEOMETRY",
            geometry_quality_status=data.geometry_quality_status,
            evidence={
                "planner_version": self.version,
                "unit_status": data.unit_status,
                "room_status": data.room_status,
                "ai_cad_match_decision": data.ai_cad_match_decision,
            },
        )
