from __future__ import annotations

from dataclasses import dataclass, asdict
from math import hypot
import re

from .contracts import CadObject
from .room_detector import RoomCandidate, point_in_polygon


@dataclass(frozen=True)
class TextRoomMatch:
    room_handle: str | None
    text_handle: str | None
    text_value: str
    normalized_text: str
    match_method: str
    distance_to_centroid: float
    confidence_score: float
    selected_as_room_name: bool

    def to_dict(self) -> dict:
        return asdict(self)


class TextRoomMatcher:
    version = 'TEXT_ROOM_MATCHER/0.6.0'

    def __init__(self, *, nearest_distance_threshold: float | None = None):
        self.nearest_distance_threshold = nearest_distance_threshold

    def match(
        self,
        rooms: list[RoomCandidate],
        objects: list[CadObject],
    ) -> list[TextRoomMatch]:
        text_objects = [
            obj for obj in objects
            if obj.entity_type in {'TEXT', 'MTEXT'} and obj.text_value and obj.geometry_json
        ]
        results: list[TextRoomMatch] = []

        for text in text_objects:
            coords = text.geometry_json.get('coordinates')
            if not coords:
                continue
            point = (float(coords[0]), float(coords[1]))
            inside = [r for r in rooms if point_in_polygon(point, r.polygon)]

            if inside:
                room = min(inside, key=lambda r: r.area)
                distance = hypot(point[0] - room.centroid[0], point[1] - room.centroid[1])
                results.append(self._result(room, text, 'INSIDE', distance, 1.0))
                continue

            if not rooms:
                continue
            room = min(rooms, key=lambda r: hypot(point[0] - r.centroid[0], point[1] - r.centroid[1]))
            distance = hypot(point[0] - room.centroid[0], point[1] - room.centroid[1])
            if self.nearest_distance_threshold is not None and distance > self.nearest_distance_threshold:
                continue
            threshold = self.nearest_distance_threshold or max(1.0, distance)
            confidence = max(0.0, 1.0 - distance / threshold) * 0.65
            results.append(self._result(room, text, 'NEAREST', distance, confidence))

        self._mark_selected(results)
        return results

    def _result(self, room, text, method, distance, confidence):
        return TextRoomMatch(
            room_handle=room.cad_object_handle,
            text_handle=text.handle,
            text_value=text.text_value or '',
            normalized_text=self.normalize_room_text(text.text_value or ''),
            match_method=method,
            distance_to_centroid=round(distance, 8),
            confidence_score=round(confidence, 5),
            selected_as_room_name=False,
        )

    @staticmethod
    def normalize_room_text(value: str) -> str:
        value = value.replace('\\P', ' ').replace('\n', ' ')
        value = re.sub(r'\s+', ' ', value).strip()
        value = re.sub(r'^[0-9]+[-_. ]*', '', value)
        return value.strip()

    @staticmethod
    def _mark_selected(results: list[TextRoomMatch]) -> None:
        by_room: dict[str | None, list[int]] = {}
        for idx, item in enumerate(results):
            by_room.setdefault(item.room_handle, []).append(idx)

        for indices in by_room.values():
            best = max(
                indices,
                key=lambda i: (
                    results[i].confidence_score,
                    -results[i].distance_to_centroid,
                    len(results[i].normalized_text),
                ),
            )
            original = results[best]
            results[best] = TextRoomMatch(
                **{**original.to_dict(), 'selected_as_room_name': True}
            )
