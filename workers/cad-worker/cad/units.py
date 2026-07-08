from __future__ import annotations

from dataclasses import dataclass, asdict
from math import log10
from typing import Iterable

from ezdxf import units as dxf_units
from ezdxf.enums import InsertUnits


@dataclass(frozen=True)
class UnitCandidate:
    unit_code: int
    unit_name: str
    meters_per_unit: float
    width_m: float
    height_m: float
    extent_area_m2: float
    plausibility_score: float
    rank: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class UnitResolution:
    source_insunits_code: int | None
    source_unit_name: str | None
    resolution_method: str
    meters_per_unit: float | None
    confidence_score: float
    status: str
    candidates: list[UnitCandidate]
    evidence: dict

    def to_dict(self) -> dict:
        return {
            **asdict(self),
            "candidates": [c.to_dict() for c in self.candidates],
        }


class CadUnitResolver:
    version = "CAD_UNIT_RESOLVER/0.7.0"

    inference_units = (
        InsertUnits.Millimeters,
        InsertUnits.Centimeters,
        InsertUnits.Meters,
        InsertUnits.Inches,
        InsertUnits.Feet,
    )

    def resolve(
        self,
        *,
        insunits_code: int | None,
        bbox: dict[str, float] | None,
    ) -> UnitResolution:
        if insunits_code not in (None, 0):
            return self._from_header(insunits_code)

        candidates = self._infer_candidates(bbox)
        confidence = candidates[0].plausibility_score if candidates else 0.0

        return UnitResolution(
            source_insunits_code=insunits_code,
            source_unit_name="Unitless" if insunits_code == 0 else None,
            resolution_method="INFERENCE",
            meters_per_unit=(
                candidates[0].meters_per_unit if candidates else None
            ),
            confidence_score=confidence,
            status="REVIEW_REQUIRED",
            candidates=candidates,
            evidence={
                "reason": "DXF unit is missing or Unitless",
                "auto_confirmation_allowed": False,
                "resolver_version": self.version,
            },
        )

    def confirm(
        self,
        *,
        unit_code: int,
        bbox: dict[str, float] | None = None,
    ) -> UnitResolution:
        unit = InsertUnits(unit_code)
        factor = float(
            dxf_units.conversion_factor(unit, InsertUnits.Meters)
        )
        candidate = self._candidate_for(unit, factor, bbox)
        candidate = UnitCandidate(**{**candidate.to_dict(), "rank": 1})

        return UnitResolution(
            source_insunits_code=unit_code,
            source_unit_name=dxf_units.unit_name(unit_code),
            resolution_method="USER_CONFIRMATION",
            meters_per_unit=factor,
            confidence_score=1.0,
            status="USER_CONFIRMED",
            candidates=[candidate],
            evidence={
                "resolver_version": self.version,
                "confirmed_by_user": True,
            },
        )

    def _from_header(self, insunits_code: int) -> UnitResolution:
        try:
            unit = InsertUnits(insunits_code)
            factor = float(
                dxf_units.conversion_factor(unit, InsertUnits.Meters)
            )
        except (ValueError, TypeError) as exc:
            return UnitResolution(
                source_insunits_code=insunits_code,
                source_unit_name=None,
                resolution_method="HEADER",
                meters_per_unit=None,
                confidence_score=0.0,
                status="REVIEW_REQUIRED",
                candidates=[],
                evidence={
                    "reason": f"Unsupported INSUNITS code: {insunits_code}",
                    "error": str(exc),
                    "resolver_version": self.version,
                },
            )

        return UnitResolution(
            source_insunits_code=insunits_code,
            source_unit_name=dxf_units.unit_name(insunits_code),
            resolution_method="HEADER",
            meters_per_unit=factor,
            confidence_score=1.0,
            status="VALIDATED",
            candidates=[],
            evidence={
                "source": "$INSUNITS",
                "resolver_version": self.version,
            },
        )

    def _infer_candidates(
        self,
        bbox: dict[str, float] | None,
    ) -> list[UnitCandidate]:
        if not bbox:
            return []

        candidates = []
        for unit in self.inference_units:
            factor = float(
                dxf_units.conversion_factor(unit, InsertUnits.Meters)
            )
            candidates.append(self._candidate_for(unit, factor, bbox))

        candidates.sort(
            key=lambda c: c.plausibility_score,
            reverse=True,
        )
        return [
            UnitCandidate(**{**c.to_dict(), "rank": rank})
            for rank, c in enumerate(candidates, start=1)
        ]

    def _candidate_for(
        self,
        unit: InsertUnits,
        factor: float,
        bbox: dict[str, float] | None,
    ) -> UnitCandidate:
        if not bbox:
            width_m = height_m = extent_area_m2 = 0.0
            score = 0.0
        else:
            width_units = abs(bbox["max_x"] - bbox["min_x"])
            height_units = abs(bbox["max_y"] - bbox["min_y"])
            width_m = width_units * factor
            height_m = height_units * factor
            extent_area_m2 = width_m * height_m
            score = _building_extent_plausibility(width_m, height_m)

        return UnitCandidate(
            unit_code=int(unit),
            unit_name=dxf_units.unit_name(int(unit)),
            meters_per_unit=factor,
            width_m=width_m,
            height_m=height_m,
            extent_area_m2=extent_area_m2,
            plausibility_score=score,
        )


def _building_extent_plausibility(
    width_m: float,
    height_m: float,
) -> float:
    if width_m <= 0 or height_m <= 0:
        return 0.0

    largest = max(width_m, height_m)
    smallest = min(width_m, height_m)

    # General engineering heuristic only.
    # It is intentionally not an automatic unit approval rule.
    if 3.0 <= smallest <= 300.0 and 5.0 <= largest <= 1000.0:
        central = 1.0
    elif 1.0 <= smallest <= 1000.0 and 2.0 <= largest <= 3000.0:
        central = 0.65
    else:
        central = 0.10

    aspect = largest / smallest
    aspect_score = 1.0 if aspect <= 20 else max(0.1, 20 / aspect)

    # Prefer sizes near tens to hundreds of meters without making
    # this sufficient for automatic approval.
    scale_center = abs(log10(max(largest, 1e-9)) - 1.7)
    scale_score = max(0.1, 1.0 - min(1.0, scale_center / 3.0))

    return round(
        max(0.0, min(1.0, 0.6 * central + 0.2 * aspect_score + 0.2 * scale_score)),
        5,
    )


def normalize_points_to_meters(
    points: Iterable[tuple[float, float]],
    meters_per_unit: float,
) -> list[tuple[float, float]]:
    if meters_per_unit <= 0:
        raise ValueError("meters_per_unit must be > 0")
    return [
        (float(x) * meters_per_unit, float(y) * meters_per_unit)
        for x, y in points
    ]


def area_to_m2(
    area_cad_units2: float,
    meters_per_unit: float,
) -> float:
    if area_cad_units2 < 0:
        raise ValueError("area_cad_units2 must be >= 0")
    if meters_per_unit <= 0:
        raise ValueError("meters_per_unit must be > 0")
    return float(area_cad_units2) * meters_per_unit * meters_per_unit
