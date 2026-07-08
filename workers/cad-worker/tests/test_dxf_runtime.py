import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.dxf_adapter import DxfAdapter
from cad.layer_classifier import LayerClassifier
from cad.room_detector import RoomDetector
from cad.text_room_matcher import TextRoomMatcher
from cad.semantic_pipeline import CadSemanticPipeline
from generate_fixture import generate


class DxfRuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = Path(__file__).resolve().parent / 'fixtures' / 'semantic_rooms.dxf'
        cls.fixture.parent.mkdir(parents=True, exist_ok=True)
        generate(cls.fixture)

    def test_actual_ezdxf_parse_and_semantics(self):
        result = DxfAdapter().read(self.fixture)
        self.assertGreaterEqual(len(result.objects), 6)

        classifier = LayerClassifier.from_json(
            Path(__file__).resolve().parents[3] / 'config' / 'cad-layer-classifier.v0.6.json'
        )
        pipeline = CadSemanticPipeline(
            layer_classifier=classifier,
            room_detector=RoomDetector(min_area=1_000_000),
            text_room_matcher=TextRoomMatcher(nearest_distance_threshold=5000),
        )
        semantic = pipeline.run(result.objects)

        room_layers = [x for x in semantic['layers'] if x['category'] == 'ROOM_BOUNDARY']
        self.assertTrue(room_layers)
        self.assertEqual(len(semantic['rooms']), 2)
        selected_names = [
            x['normalized_text']
            for x in semantic['text_room_matches']
            if x['selected_as_room_name']
        ]
        self.assertIn('회의실 A', selected_names)
        self.assertIn('사무실 B', selected_names)


if __name__ == '__main__':
    unittest.main()
