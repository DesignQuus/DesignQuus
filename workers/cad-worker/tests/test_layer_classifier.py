import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.contracts import CadObject
from cad.layer_classifier import LayerClassifier


class LayerClassifierTests(unittest.TestCase):
    def setUp(self):
        self.classifier = LayerClassifier.from_json(
            Path(__file__).resolve().parents[3] / 'config' / 'cad-layer-classifier.v0.6.json'
        )

    def test_room_layer(self):
        objects = [
            CadObject('LWPOLYLINE', '1', 'A-ROOM', {'type':'POLYGON','coordinates':[[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,0]]]}),
            CadObject('LWPOLYLINE', '2', 'A-ROOM', {'type':'POLYGON','coordinates':[[[2,0,0],[3,0,0],[3,1,0],[2,1,0],[2,0,0]]]}),
        ]
        result = self.classifier.classify(objects)[0]
        self.assertEqual(result.category, 'ROOM_BOUNDARY')
        self.assertGreater(result.confidence_score, 0.5)

    def test_hvac_equipment_layer(self):
        obj = CadObject('BLOCK_REFERENCE', '3', 'M-HVAC-EQUIP', {'type':'POINT','coordinates':[0,0,0]}, block_name='ERV')
        result = self.classifier.classify([obj])[0]
        self.assertEqual(result.category, 'HVAC_EQUIPMENT')


if __name__ == '__main__':
    unittest.main()
