from __future__ import annotations

from dataclasses import dataclass, asdict
from difflib import SequenceMatcher
from math import hypot
from pathlib import Path
import json

from .exact_geometry import ExactGeometryEngine
from .room_detector import polygon_area, polygon_centroid


@dataclass(frozen=True)
class ExactMatchCandidate:
    ai_id: str
    cad_id: str
    geometry_iou: float
    intersection_area: float
    union_area: float
    centroid_score: float
    area_score: float
    text_score: float
    layer_score: float
    total_score: float
    geometry_repair_applied: bool
    rank: int | None = None
    gap_to_second: float | None = None
    decision: str | None = None
    geometry_engine: str = "SHAPELY_GEOS_EXACT/0.7.0"

    def to_dict(self) -> dict:
        return asdict(self)


class ExactAiCadMatcher:
    version = "AI_CAD_MATCHER/0.7.0"

    def __init__(
        self,
        policy: dict,
        geometry_engine: ExactGeometryEngine | None = None,
    ):
        self.policy = policy
        self.geometry_engine = geometry_engine or ExactGeometryEngine()

    @classmethod
    def from_json(
        cls,
        path: str | Path,
    ) -> "ExactAiCadMatcher":
        return cls(
            json.loads(Path(path).read_text(encoding="utf-8"))
        )

    def match_one(
        self,
        ai_room: dict,
        cad_rooms: list[dict],
    ) -> list[ExactMatchCandidate]:
        scored = [self._score(ai_room, cad) for cad in cad_rooms]
        scored.sort(key=lambda x: x.total_score, reverse=True)
        second_score = scored[1].total_score if len(scored) > 1 else 0.0
        thresholds = self.policy["thresholds"]

        final = []
        for rank, item in enumerate(scored, start=1):
            gap = item.total_score - second_score if rank == 1 else None
            decision = "REJECTED"

            if rank == 1:
                if (
                    item.total_score >= thresholds["auto_match_min_score"]
                    and gap is not None
                    and gap >= thresholds["auto_match_min_gap_to_second"]
                ):
                    decision = "AUTO_MATCH"
                elif item.total_score >= thresholds["review_min_score"]:
                    decision = "REVIEW_REQUIRED"
            elif item.total_score >= thresholds["review_min_score"]:
                decision = "REVIEW_REQUIRED"

            final.append(
                ExactMatchCandidate(
                    **{
                        **item.to_dict(),
                        "rank": rank,
                        "gap_to_second": (
                            round(gap, 5) if gap is not None else None
                        ),
                        "decision": decision,
                    }
                )
            )
        return final

    def _score(
        self,
        ai: dict,
        cad: dict,
    ) -> ExactMatchCandidate:
        weights = self.policy["weights"]
        ai_poly = [tuple(p) for p in ai["polygon"]]
        cad_poly = [tuple(p) for p in cad["polygon"]]

        iou_result = self.geometry_engine.exact_iou(
            ai_poly,
            cad_poly,
        )

        centroid_score = centroid_proximity_score(
            polygon_centroid(ai_poly),
            polygon_centroid(cad_poly),
            full_score_distance=float(
                self.policy["centroid_distance_full_score"]
            ),
            zero_score_distance=float(
                self.policy["centroid_distance_zero_score"]
            ),
        )

        area_score = area_similarity_score(
            polygon_area(ai_poly),
            polygon_area(cad_poly),
        )

        text_score = SequenceMatcher(
            None,
            normalize_text(ai.get("text", "")),
            normalize_text(cad.get("text", "")),
        ).ratio()

        layer_score = max(
            0.0,
            min(1.0, float(cad.get("layer_confidence", 0.0))),
        )

        total = (
            weights["geometry_iou"] * iou_result.iou
            + weights["centroid_proximity"] * centroid_score
            + weights["area_similarity"] * area_score
            + weights["text_similarity"] * text_score
            + weights["layer_confidence"] * layer_score
        )

        return ExactMatchCandidate(
            ai_id=str(ai["id"]),
            cad_id=str(cad["id"]),
            geometry_iou=round(iou_result.iou, 5),
            intersection_area=round(
                iou_result.intersection_area, 12
            ),
            union_area=round(iou_result.union_area, 12),
            centroid_score=round(centroid_score, 5),
            area_score=round(area_score, 5),
            text_score=round(text_score, 5),
            layer_score=round(layer_score, 5),
            total_score=round(total, 5),
            geometry_repair_applied=(
                iou_result.repair_applied
            ),
        )


def normalize_text(value: str) -> str:
    return "".join(
        ch
        for ch in value.casefold().strip()
        if ch.isalnum() or ("가" <= ch <= "힣")
    )


def area_similarity_score(a: float, b: float) -> float:
    if a <= 0 or b <= 0:
        return 0.0
    return min(a, b) / max(a, b)


def centroid_proximity_score(
    a,
    b,
    *,
    full_score_distance: float,
    zero_score_distance: float,
) -> float:
    d = hypot(a[0] - b[0], a[1] - b[1])
    if d <= full_score_distance:
        return 1.0
    if d >= zero_score_distance:
        return 0.0
    span = zero_score_distance - full_score_distance
    return 1.0 - (d - full_score_distance) / span
