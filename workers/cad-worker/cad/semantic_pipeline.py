from __future__ import annotations

from .layer_classifier import LayerClassifier
from .room_detector import RoomDetector
from .text_room_matcher import TextRoomMatcher


class CadSemanticPipeline:
    version = 'CAD_SEMANTIC_PIPELINE/0.6.0'

    def __init__(
        self,
        *,
        layer_classifier: LayerClassifier,
        room_detector: RoomDetector,
        text_room_matcher: TextRoomMatcher,
    ):
        self.layer_classifier = layer_classifier
        self.room_detector = room_detector
        self.text_room_matcher = text_room_matcher

    def run(self, objects):
        layer_results = self.layer_classifier.classify(objects)
        layer_map = {r.layer_name: r for r in layer_results}
        rooms = self.room_detector.detect(objects, layer_map)
        text_matches = self.text_room_matcher.match(rooms, objects)
        return {
            'pipeline_version': self.version,
            'layers': [r.to_dict() for r in layer_results],
            'rooms': [r.to_dict() for r in rooms],
            'text_room_matches': [r.to_dict() for r in text_matches],
        }
