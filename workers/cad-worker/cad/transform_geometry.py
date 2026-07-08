from __future__ import annotations

from .transform import transform_points, validate_page_points


def cad_geometry_to_page(
    geometry: dict,
    matrix: list[list[float]],
    *,
    require_in_page: bool = False,
) -> dict:
    kind = geometry.get("type")

    if kind == "POINT":
        x, y, *_ = geometry["coordinates"]
        pts = transform_points(matrix, [(x, y)])
        if require_in_page:
            validate_page_points(pts)
        return {"type": "POINT", "coordinates": list(pts[0])}

    if kind == "LINESTRING":
        raw = [(p[0], p[1]) for p in geometry["coordinates"]]
        pts = transform_points(matrix, raw)
        if require_in_page:
            validate_page_points(pts)
        return {"type": "POLYLINE", "points": [list(p) for p in pts]}

    if kind == "POLYGON":
        ring = geometry["coordinates"][0]
        raw = [(p[0], p[1]) for p in ring]
        pts = transform_points(matrix, raw)
        if require_in_page:
            validate_page_points(pts)
        return {"type": "POLYGON", "points": [list(p) for p in pts]}

    raise ValueError(f"Unsupported CAD geometry type: {kind}")
