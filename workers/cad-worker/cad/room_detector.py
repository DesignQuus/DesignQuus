from __future__ import annotations

from dataclasses import dataclass, asdict
from math import hypot
from typing import Iterable

from .contracts import CadObject
from .layer_classifier import LayerClassification


def _strip_closure(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(points) >= 2 and points[0] == points[-1]:
        return points[:-1]
    return points


def polygon_area(points: list[tuple[float, float]]) -> float:
    pts = _strip_closure(points)
    if len(pts) < 3:
        return 0.0
    return abs(sum(
        pts[i][0] * pts[(i + 1) % len(pts)][1]
        - pts[(i + 1) % len(pts)][0] * pts[i][1]
        for i in range(len(pts))
    )) / 2.0


def polygon_centroid(points: list[tuple[float, float]]) -> tuple[float, float]:
    pts = _strip_closure(points)
    if len(pts) < 3:
        raise ValueError('Polygon requires at least 3 points')
    signed_area_twice = sum(
        pts[i][0] * pts[(i + 1) % len(pts)][1]
        - pts[(i + 1) % len(pts)][0] * pts[i][1]
        for i in range(len(pts))
    )
    if abs(signed_area_twice) < 1e-15:
        return (
            sum(p[0] for p in pts) / len(pts),
            sum(p[1] for p in pts) / len(pts),
        )
    cx = 0.0
    cy = 0.0
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        cross = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
        cx += (pts[i][0] + pts[j][0]) * cross
        cy += (pts[i][1] + pts[j][1]) * cross
    return cx / (3.0 * signed_area_twice), cy / (3.0 * signed_area_twice)


def point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    x, y = point
    pts = _strip_closure(polygon)
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-30) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def _orientation(a, b, c) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _segments_intersect(a, b, c, d) -> bool:
    o1 = _orientation(a, b, c)
    o2 = _orientation(a, b, d)
    o3 = _orientation(c, d, a)
    o4 = _orientation(c, d, b)
    return ((o1 > 0 > o2) or (o1 < 0 < o2)) and ((o3 > 0 > o4) or (o3 < 0 < o4))


def is_self_intersecting(points: list[tuple[float, float]]) -> bool:
    pts = _strip_closure(points)
    n = len(pts)
    if n < 4:
        return False
    edges = [(pts[i], pts[(i + 1) % n]) for i in range(n)]
    for i, (a, b) in enumerate(edges):
        for j, (c, d) in enumerate(edges):
            if i >= j:
                continue
            if abs(i - j) in (0, 1) or {i, j} == {0, n - 1}:
                continue
            if _segments_intersect(a, b, c, d):
                return True
    return False


def polygon_bbox(points: list[tuple[float, float]]) -> dict[str, float]:
    pts = _strip_closure(points)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {'min_x': min(xs), 'min_y': min(ys), 'max_x': max(xs), 'max_y': max(ys)}


@dataclass(frozen=True)
class RoomCandidate:
    cad_object_handle: str | None
    layer_name: str
    layer_category: str
    polygon: list[tuple[float, float]]
    area: float
    centroid: tuple[float, float]
    bbox: dict[str, float]
    geometry_valid: bool
    self_intersecting: bool
    candidate_score: float
    score_breakdown: dict[str, float]

    def to_dict(self) -> dict:
        return asdict(self)


class RoomDetector:
    version = 'ROOM_DETECTOR/0.6.0'

    def __init__(self, *, min_area: float = 1.0):
        if min_area <= 0:
            raise ValueError('min_area must be > 0')
        self.min_area = min_area

    def detect(
        self,
        objects: Iterable[CadObject],
        layer_classifications: dict[str, LayerClassification],
    ) -> list[RoomCandidate]:
        candidates: list[RoomCandidate] = []
        for obj in objects:
            if obj.entity_type not in {'LWPOLYLINE', 'POLYLINE'}:
                continue
            if not obj.geometry_json or obj.geometry_json.get('type') != 'POLYGON':
                continue

            raw_ring = obj.geometry_json['coordinates'][0]
            points = [(float(p[0]), float(p[1])) for p in raw_ring]
            area = polygon_area(points)
            if area < self.min_area:
                continue

            self_x = is_self_intersecting(points)
            valid = not self_x and len(_strip_closure(points)) >= 3
            centroid = polygon_centroid(points)
            layer_result = layer_classifications.get(obj.layer_name)
            layer_category = layer_result.category if layer_result else 'UNKNOWN'
            layer_conf = layer_result.confidence_score if layer_result else 0.0

            layer_score = 1.0 if layer_category == 'ROOM_BOUNDARY' else min(0.5, layer_conf)
            geometry_score = 1.0 if valid else 0.0
            area_score = min(1.0, area / (self.min_area * 10.0))
            closed_score = 1.0

            total = (
                0.45 * layer_score
                + 0.30 * geometry_score
                + 0.15 * area_score
                + 0.10 * closed_score
            )

            candidates.append(RoomCandidate(
                cad_object_handle=obj.handle,
                layer_name=obj.layer_name,
                layer_category=layer_category,
                polygon=_strip_closure(points),
                area=area,
                centroid=centroid,
                bbox=polygon_bbox(points),
                geometry_valid=valid,
                self_intersecting=self_x,
                candidate_score=round(total, 5),
                score_breakdown={
                    'layer_score': round(layer_score, 5),
                    'geometry_score': round(geometry_score, 5),
                    'area_score': round(area_score, 5),
                    'closed_score': closed_score,
                },
            ))

        return sorted(candidates, key=lambda c: c.candidate_score, reverse=True)
