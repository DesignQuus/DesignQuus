from __future__ import annotations

from dataclasses import dataclass, asdict
from math import isclose
from typing import Any


DEFAULT_PRIORITIES = {
    "USER_CONFIRMED": 100,
    "IFC_VERIFIED": 90,
    "CAD_EXACT": 85,
    "CAD_TEXT": 75,
    "AI_EXTRACTION": 60,
    "PROJECT_DEFAULT": 40,
    "SYSTEM_DEFAULT": 10,
    "DERIVED": 5,
}


@dataclass(frozen=True)
class AttributeCandidate:
    field_code: str
    value: Any
    source_type: str
    confidence_score: float | None = None
    source_id: str | None = None
    priority: int | None = None
    evidence: dict[str, Any] | None = None

    def effective_priority(self) -> int:
        if self.priority is not None:
            return self.priority
        return DEFAULT_PRIORITIES.get(self.source_type, 0)

    def validate(self) -> None:
        if self.source_type not in DEFAULT_PRIORITIES:
            raise ValueError(f"Unsupported source_type: {self.source_type}")
        if self.confidence_score is not None and not (
            0.0 <= self.confidence_score <= 1.0
        ):
            raise ValueError("confidence_score must be within [0, 1]")


@dataclass(frozen=True)
class ResolvedField:
    field_code: str
    value: Any
    source_type: str
    source_id: str | None
    confidence_score: float | None
    priority: int
    conflict: bool
    candidate_count: int
    evidence: dict[str, Any]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class SpaceDesignProfile:
    fields: dict[str, ResolvedField]
    conflicts: list[dict]
    missing_fields: list[str]
    status: str
    resolver_version: str = "SPACE_PROFILE_RESOLVER/0.8.0"

    def get(self, field_code: str, default=None):
        item = self.fields.get(field_code)
        return item.value if item else default

    def to_dict(self) -> dict:
        return {
            "fields": {
                key: value.to_dict()
                for key, value in self.fields.items()
            },
            "conflicts": self.conflicts,
            "missing_fields": self.missing_fields,
            "status": self.status,
            "resolver_version": self.resolver_version,
        }


class SpaceProfileResolver:
    version = "SPACE_PROFILE_RESOLVER/0.8.0"

    numeric_tolerances = {
        "area_m2": 0.05,
        "occupancy_design": 0.0,
        "occupancy_normal": 0.0,
        "ceiling_height_m": 0.02,
        "volume_m3": 0.10,
        "exterior_wall_area_m2": 0.10,
        "window_area_m2": 0.10,
    }

    def resolve(
        self,
        candidates: list[AttributeCandidate],
        *,
        required_fields: list[str] | None = None,
        derive_volume: bool = True,
    ) -> SpaceDesignProfile:
        for candidate in candidates:
            candidate.validate()

        grouped: dict[str, list[AttributeCandidate]] = {}
        for candidate in candidates:
            if candidate.value is None:
                continue
            grouped.setdefault(candidate.field_code, []).append(candidate)

        resolved: dict[str, ResolvedField] = {}
        conflicts: list[dict] = []

        for field_code, items in grouped.items():
            items = sorted(
                items,
                key=lambda x: (
                    x.effective_priority(),
                    x.confidence_score if x.confidence_score is not None else 0.0,
                ),
                reverse=True,
            )

            winner = items[0]
            conflict = self._has_conflict(field_code, items)

            if conflict:
                conflicts.append({
                    "field_code": field_code,
                    "selected_value": winner.value,
                    "candidates": [
                        {
                            "value": item.value,
                            "source_type": item.source_type,
                            "priority": item.effective_priority(),
                            "confidence_score": item.confidence_score,
                        }
                        for item in items
                    ],
                })

            resolved[field_code] = ResolvedField(
                field_code=field_code,
                value=winner.value,
                source_type=winner.source_type,
                source_id=winner.source_id,
                confidence_score=winner.confidence_score,
                priority=winner.effective_priority(),
                conflict=conflict,
                candidate_count=len(items),
                evidence=winner.evidence or {},
            )

        if derive_volume and "volume_m3" not in resolved:
            area = resolved.get("area_m2")
            height = resolved.get("ceiling_height_m")
            if area and height:
                volume = float(area.value) * float(height.value)
                resolved["volume_m3"] = ResolvedField(
                    field_code="volume_m3",
                    value=round(volume, 6),
                    source_type="DERIVED",
                    source_id=None,
                    confidence_score=min(
                        x
                        for x in [
                            area.confidence_score if area.confidence_score is not None else 1.0,
                            height.confidence_score if height.confidence_score is not None else 1.0,
                        ]
                    ),
                    priority=DEFAULT_PRIORITIES["DERIVED"],
                    conflict=False,
                    candidate_count=1,
                    evidence={
                        "formula": "area_m2 * ceiling_height_m",
                        "input_fields": ["area_m2", "ceiling_height_m"],
                    },
                )

        required = required_fields or []
        missing = [
            field_code
            for field_code in required
            if field_code not in resolved
        ]

        if conflicts:
            status = "REVIEW_REQUIRED"
        elif missing:
            status = "REVIEW_REQUIRED"
        else:
            status = "READY"

        return SpaceDesignProfile(
            fields=resolved,
            conflicts=conflicts,
            missing_fields=missing,
            status=status,
        )

    def _has_conflict(
        self,
        field_code: str,
        items: list[AttributeCandidate],
    ) -> bool:
        if len(items) < 2:
            return False

        top_priority = items[0].effective_priority()
        peers = [
            item
            for item in items
            if item.effective_priority() == top_priority
        ]

        if len(peers) < 2:
            return False

        first = peers[0].value
        return any(
            not self._equivalent(field_code, first, item.value)
            for item in peers[1:]
        )

    def _equivalent(
        self,
        field_code: str,
        a: Any,
        b: Any,
    ) -> bool:
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            tolerance = self.numeric_tolerances.get(field_code, 0.0)
            return isclose(float(a), float(b), abs_tol=tolerance)
        return str(a).strip().casefold() == str(b).strip().casefold()
