from pathlib import Path
import json

from cad.dxf_adapter import DxfAdapter
from cad.layer_classifier import LayerClassifier
from cad.room_detector import RoomDetector
from cad.text_room_matcher import TextRoomMatcher
from cad.semantic_pipeline import CadSemanticPipeline

ROOT = Path(__file__).resolve().parents[2]
fixture = Path(__file__).resolve().parent / 'tests' / 'fixtures' / 'semantic_rooms.dxf'

classifier = LayerClassifier.from_json(ROOT / 'config' / 'cad-layer-classifier.v0.6.json')
result = DxfAdapter().read(fixture)
pipeline = CadSemanticPipeline(
    layer_classifier=classifier,
    room_detector=RoomDetector(min_area=1_000_000),
    text_room_matcher=TextRoomMatcher(nearest_distance_threshold=5000),
)
print(json.dumps(pipeline.run(result.objects), ensure_ascii=False, indent=2))
