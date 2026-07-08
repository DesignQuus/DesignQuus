from __future__ import annotations

from typing import Any

from .contracts import CadObject
from .geometry import point, line, polyline, bbox_from_points


def normalize_line(
    *,
    handle: str | None,
    layer: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
) -> CadObject:
    pts = [start, end]
    return CadObject(
        entity_type="LINE",
        handle=handle,
        layer_name=layer,
        geometry_json=line(start, end),
        bbox_json=bbox_from_points(pts),
    )


def normalize_text(
    *,
    handle: str | None,
    layer: str,
    text_value: str,
    insert: tuple[float, float, float],
    height: float | None = None,
    rotation_deg: float | None = None,
    multiline: bool = False,
) -> CadObject:
    return CadObject(
        entity_type="MTEXT" if multiline else "TEXT",
        handle=handle,
        layer_name=layer,
        geometry_json=point(*insert),
        text_value=text_value,
        bbox_json=bbox_from_points([insert]),
        attributes={
            "height": height,
            "rotation_deg": rotation_deg,
        },
    )


def normalize_polyline(
    *,
    handle: str | None,
    layer: str,
    points: list[tuple[float, float, float]],
    closed: bool,
    lightweight: bool = True,
) -> CadObject:
    return CadObject(
        entity_type="LWPOLYLINE" if lightweight else "POLYLINE",
        handle=handle,
        layer_name=layer,
        geometry_json=polyline(points, closed=closed),
        bbox_json=bbox_from_points(points),
        attributes={"closed": closed},
    )


def normalize_block_reference(
    *,
    handle: str | None,
    layer: str,
    block_name: str,
    insert: tuple[float, float, float],
    rotation_deg: float,
    x_scale: float,
    y_scale: float,
    z_scale: float,
    attribs: dict[str, str],
) -> CadObject:
    return CadObject(
        entity_type="BLOCK_REFERENCE",
        handle=handle,
        layer_name=layer,
        geometry_json=point(*insert),
        block_name=block_name,
        bbox_json=bbox_from_points([insert]),
        attributes={
            "rotation_deg": rotation_deg,
            "x_scale": x_scale,
            "y_scale": y_scale,
            "z_scale": z_scale,
            "attribs": attribs,
        },
    )
