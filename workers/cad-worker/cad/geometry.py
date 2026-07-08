from __future__ import annotations

from typing import Iterable


def point(x: float, y: float, z: float = 0.0) -> dict:
    return {"type": "POINT", "coordinates": [float(x), float(y), float(z)]}


def line(start: Iterable[float], end: Iterable[float]) -> dict:
    s = list(start)
    e = list(end)
    return {
        "type": "LINESTRING",
        "coordinates": [
            [float(s[0]), float(s[1]), float(s[2] if len(s) > 2 else 0.0)],
            [float(e[0]), float(e[1]), float(e[2] if len(e) > 2 else 0.0)],
        ],
    }


def polyline(points: Iterable[Iterable[float]], closed: bool = False) -> dict:
    coords = []
    for p in points:
        p = list(p)
        coords.append([
            float(p[0]),
            float(p[1]),
            float(p[2] if len(p) > 2 else 0.0),
        ])
    if closed and coords and coords[0] != coords[-1]:
        coords.append(coords[0])
    return {
        "type": "POLYGON" if closed else "LINESTRING",
        "coordinates": [coords] if closed else coords,
    }


def bbox_from_points(points: Iterable[Iterable[float]]) -> dict[str, float] | None:
    pts = [list(p) for p in points]
    if not pts:
        return None
    xs = [float(p[0]) for p in pts]
    ys = [float(p[1]) for p in pts]
    return {
        "min_x": min(xs),
        "min_y": min(ys),
        "max_x": max(xs),
        "max_y": max(ys),
    }
