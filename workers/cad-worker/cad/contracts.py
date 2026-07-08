from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Literal

CadEntityType = Literal[
    "LAYER",
    "TEXT",
    "MTEXT",
    "BLOCK_REFERENCE",
    "LINE",
    "LWPOLYLINE",
    "POLYLINE",
    "CIRCLE",
    "ARC",
    "POINT",
    "OTHER",
]


@dataclass(frozen=True)
class CadObject:
    entity_type: CadEntityType
    handle: str | None
    layer_name: str
    geometry_json: dict[str, Any] | None = None
    text_value: str | None = None
    block_name: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)
    bbox_json: dict[str, float] | None = None
    coordinate_space: str = "CAD_MODEL"

    def validate(self) -> None:
        if self.coordinate_space != "CAD_MODEL":
            raise ValueError("CAD objects must use CAD_MODEL coordinate space")
        if not self.layer_name:
            raise ValueError("layer_name is required")
        if self.entity_type in {"TEXT", "MTEXT"} and self.text_value is None:
            raise ValueError(f"{self.entity_type} requires text_value")
        if self.entity_type == "BLOCK_REFERENCE" and not self.block_name:
            raise ValueError("BLOCK_REFERENCE requires block_name")

    def to_dict(self) -> dict[str, Any]:
        self.validate()
        return asdict(self)


@dataclass(frozen=True)
class CadImportResult:
    source_units: str | None
    objects: list[CadObject]
    parser_adapter: str
    parser_version: str
    source_unit_code: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_units": self.source_units,
            "source_unit_code": self.source_unit_code,
            "objects": [obj.to_dict() for obj in self.objects],
            "parser_adapter": self.parser_adapter,
            "parser_version": self.parser_version,
            "object_count": len(self.objects),
        }
