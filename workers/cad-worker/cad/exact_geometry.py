from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Iterable, Any

from shapely import make_valid, union_all
from shapely.geometry import (
    GeometryCollection,
    MultiPolygon,
    Polygon,
    mapping,
)
from shapely.geometry.base import BaseGeometry


@dataclass(frozen=True)
class GeometryAnalysis:
    status: str
    original_valid: bool
    repair_applied: bool
    auto_promotable: bool
    area: float
    perimeter: float
    centroid: tuple[float, float] | None
    geometry_geojson: dict[str, Any] | None
    fragment_count: int
    validity_reason: str | None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class IoUResult:
    iou: float
    intersection_area: float
    union_area: float
    repair_applied: bool
    engine_version: str = "SHAPELY_GEOS_EXACT/0.7.0"

    def to_dict(self) -> dict:
        return asdict(self)


class ExactGeometryEngine:
    version = "EXACT_GEOMETRY/0.7.0"

    def analyze_polygon(
        self,
        points: Iterable[tuple[float, float]],
        *,
        allow_repair: bool = True,
    ) -> GeometryAnalysis:
        pts = _deduplicate_ring(points)
        if len(pts) < 3:
            return GeometryAnalysis(
                status="EMPTY",
                original_valid=False,
                repair_applied=False,
                auto_promotable=False,
                area=0.0,
                perimeter=0.0,
                centroid=None,
                geometry_geojson=None,
                fragment_count=0,
                validity_reason="Polygon requires at least 3 unique points",
            )

        original = Polygon(pts)
        original_valid = bool(original.is_valid)
        repair_applied = False
        geometry: BaseGeometry = original

        if original.is_empty:
            return _empty_analysis("Input polygon is empty")

        if not original_valid:
            if not allow_repair:
                return GeometryAnalysis(
                    status="INVALID",
                    original_valid=False,
                    repair_applied=False,
                    auto_promotable=False,
                    area=float(original.area),
                    perimeter=float(original.length),
                    centroid=None,
                    geometry_geojson=mapping(original),
                    fragment_count=0,
                    validity_reason="Invalid polygon and repair disabled",
                )
            geometry = make_valid(original)
            repair_applied = True

        polygonal = _polygonal_components(geometry)
        if not polygonal:
            return GeometryAnalysis(
                status="INVALID",
                original_valid=original_valid,
                repair_applied=repair_applied,
                auto_promotable=False,
                area=0.0,
                perimeter=0.0,
                centroid=None,
                geometry_geojson=mapping(geometry),
                fragment_count=0,
                validity_reason="No polygonal component after validation",
            )

        merged = union_all(polygonal)
        fragment_count = len(polygonal)

        if isinstance(merged, Polygon):
            status = "VALID" if original_valid else "REPAIRED_SINGLE"
            auto_promotable = True
        elif isinstance(merged, MultiPolygon):
            status = "REPAIRED_FRAGMENTED"
            auto_promotable = False
        else:
            status = "INVALID"
            auto_promotable = False

        centroid = (
            (float(merged.centroid.x), float(merged.centroid.y))
            if not merged.is_empty
            else None
        )

        return GeometryAnalysis(
            status=status,
            original_valid=original_valid,
            repair_applied=repair_applied,
            auto_promotable=auto_promotable,
            area=float(merged.area),
            perimeter=float(merged.length),
            centroid=centroid,
            geometry_geojson=mapping(merged),
            fragment_count=fragment_count,
            validity_reason=None if merged.is_valid else "Result geometry is invalid",
        )

    def exact_iou(
        self,
        a_points: Iterable[tuple[float, float]],
        b_points: Iterable[tuple[float, float]],
    ) -> IoUResult:
        a = self._validated_polygonal(a_points)
        b = self._validated_polygonal(b_points)

        intersection = a.intersection(b)
        union = a.union(b)

        intersection_area = float(intersection.area)
        union_area = float(union.area)
        iou = intersection_area / union_area if union_area > 0 else 0.0

        a_original = Polygon(_deduplicate_ring(a_points))
        b_original = Polygon(_deduplicate_ring(b_points))

        return IoUResult(
            iou=max(0.0, min(1.0, float(iou))),
            intersection_area=intersection_area,
            union_area=union_area,
            repair_applied=(not a_original.is_valid or not b_original.is_valid),
        )

    def _validated_polygonal(
        self,
        points: Iterable[tuple[float, float]],
    ) -> BaseGeometry:
        pts = _deduplicate_ring(points)
        if len(pts) < 3:
            raise ValueError("Polygon requires at least 3 unique points")

        geometry: BaseGeometry = Polygon(pts)
        if not geometry.is_valid:
            geometry = make_valid(geometry)

        polygonal = _polygonal_components(geometry)
        if not polygonal:
            raise ValueError("No polygonal component after geometry validation")

        return union_all(polygonal)


def _deduplicate_ring(
    points: Iterable[tuple[float, float]],
) -> list[tuple[float, float]]:
    result: list[tuple[float, float]] = []
    for x, y in points:
        p = (float(x), float(y))
        if not result or p != result[-1]:
            result.append(p)
    if len(result) >= 2 and result[0] == result[-1]:
        result.pop()
    return result


def _polygonal_components(geometry: BaseGeometry) -> list[Polygon]:
    if isinstance(geometry, Polygon):
        return [geometry]

    if isinstance(geometry, MultiPolygon):
        return list(geometry.geoms)

    if isinstance(geometry, GeometryCollection):
        polygons: list[Polygon] = []
        for geom in geometry.geoms:
            polygons.extend(_polygonal_components(geom))
        return polygons

    return []


def _empty_analysis(reason: str) -> GeometryAnalysis:
    return GeometryAnalysis(
        status="EMPTY",
        original_valid=False,
        repair_applied=False,
        auto_promotable=False,
        area=0.0,
        perimeter=0.0,
        centroid=None,
        geometry_geojson=None,
        fragment_count=0,
        validity_reason=reason,
    )
