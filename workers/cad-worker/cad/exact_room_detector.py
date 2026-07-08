from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Iterable

from .contracts import CadObject
from .exact_geometry import ExactGeometryEngine
from .layer_classifier import LayerClassification
from .units import UnitResolution, normalize_points_to_meters


@dataclass(frozen=True)
class ExactRoomCandidate:
    cad_object_handle: str | None
    layer_name: str
    layer_category: str
    polygon_cad: list[tuple[float, float]]
    polygon_m: list[tuple[float, float]]
    area_m2: float
    perimeter_m: float
    centroid_m: tuple[float, float] | None
    geometry_quality_status: str
    geometry_repair_applied: bool
    auto_promotable: bool
    exact_geometry_geojson: dict | None
    candidate_score: float
    score_breakdown: dict[str, float]

    def to_dict(self) -> dict:
        return asdict(self)


class ExactRoomDetector:
    version = "EXACT_ROOM_DETECTOR/0.7.0"

    def __init__(
        self,
        *,
        min_area_m2: float = 1.0,
        max_area_m2: float = 1_000_000.0,
        geometry_engine: ExactGeometryEngine | None = None,
    ):
        if min_area_m2 <= 0:
            raise ValueError("min_area_m2 must be > 0")
        if max_area_m2 <= min_area_m2:
            raise ValueError("max_area_m2 must be greater than min_area_m2")
        self.min_area_m2 = min_area_m2
        self.max_area_m2 = max_area_m2
        self.geometry_engine = geometry_engine or ExactGeometryEngine()

    def detect(
        self,
        objects: Iterable[CadObject],
        layer_classifications: dict[str, LayerClassification],
        unit_resolution: UnitResolution,
    ) -> list[ExactRoomCandidate]:
        if unit_resolution.status not in {"VALIDATED", "USER_CONFIRMED"}:
            raise ValueError("Validated CAD unit resolution is required")
        if unit_resolution.meters_per_unit is None:
            raise ValueError("meters_per_unit is required")

        candidates: list[ExactRoomCandidate] = []

        for obj in objects:
            if obj.entity_type not in {"LWPOLYLINE", "POLYLINE"}:
                continue
            if not obj.geometry_json or obj.geometry_json.get("type") != "POLYGON":
                continue

            ring = obj.geometry_json["coordinates"][0]
            cad_points = [(float(p[0]), float(p[1])) for p in ring]
            meter_points = normalize_points_to_meters(
                cad_points,
                unit_resolution.meters_per_unit,
            )

            analysis = self.geometry_engine.analyze_polygon(meter_points)

            if analysis.area < self.min_area_m2:
                continue
            if analysis.area > self.max_area_m2:
                continue

            layer_result = layer_classifications.get(obj.layer_name)
            layer_category = (
                layer_result.category if layer_result else "UNKNOWN"
            )
            layer_conf = (
                layer_result.confidence_score if layer_result else 0.0
            )

            layer_score = (
                1.0
                if layer_category == "ROOM_BOUNDARY"
                else min(0.5, layer_conf)
            )
            geometry_score = (
                1.0
                if analysis.status == "VALID"
                else 0.8
                if analysis.status == "REPAIRED_SINGLE"
                else 0.0
            )
            area_score = min(
                1.0,
                analysis.area / (self.min_area_m2 * 10.0),
            )
            unit_score = (
                1.0
                if unit_resolution.status in {"VALIDATED", "USER_CONFIRMED"}
                else 0.0
            )

            total = (
                0.40 * layer_score
                + 0.35 * geometry_score
                + 0.15 * area_score
                + 0.10 * unit_score
            )

            candidates.append(
                ExactRoomCandidate(
                    cad_object_handle=obj.handle,
                    layer_name=obj.layer_name,
                    layer_category=layer_category,
                    polygon_cad=cad_points,
                    polygon_m=meter_points,
                    area_m2=round(analysis.area, 6),
                    perimeter_m=round(analysis.perimeter, 6),
                    centroid_m=analysis.centroid,
                    geometry_quality_status=analysis.status,
                    geometry_repair_applied=analysis.repair_applied,
                    auto_promotable=analysis.auto_promotable,
                    exact_geometry_geojson=analysis.geometry_geojson,
                    candidate_score=round(total, 5),
                    score_breakdown={
                        "layer_score": round(layer_score, 5),
                        "geometry_score": round(geometry_score, 5),
                        "area_score": round(area_score, 5),
                        "unit_score": round(unit_score, 5),
                    },
                )
            )

        return sorted(
            candidates,
            key=lambda c: c.candidate_score,
            reverse=True,
        )
