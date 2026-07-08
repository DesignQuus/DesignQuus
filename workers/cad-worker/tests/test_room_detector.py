import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.contracts import CadObject
from cad.layer_classifier import LayerClassification
from cad.room_detector import RoomDetector, polygon_area, point_in_polygon, is_self_intersecting


class RoomDetectorTests(unittest.TestCase):
    def test_rectangle_area_and_inside(self):
        poly = [(0,0),(10,0),(10,5),(0,5)]
        self.assertEqual(polygon_area(poly), 50)
        self.assertTrue(point_in_polygon((5,2), poly))
        self.assertFalse(point_in_polygon((11,2), poly))

    def test_self_intersection(self):
        bow = [(0,0),(10,10),(0,10),(10,0)]
        self.assertTrue(is_self_intersecting(bow))

    def test_detect_only_polygon(self):
        room = CadObject(
            'LWPOLYLINE','1','A-ROOM',
            {'type':'POLYGON','coordinates':[[[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,0]]]},
            attributes={'closed': True}
        )
        open_line = CadObject(
            'LWPOLYLINE','2','A-WALL',
            {'type':'LINESTRING','coordinates':[[0,0,0],[10,0,0]]},
            attributes={'closed': False}
        )
        cls = {
            'A-ROOM': LayerClassification('A-ROOM','ROOM_BOUNDARY',0.9,{},[],1,{'LWPOLYLINE':1})
        }
        result = RoomDetector(min_area=10).detect([room, open_line], cls)
        self.assertEqual(len(result), 1)
        self.assertGreater(result[0].candidate_score, 0.8)


if __name__ == '__main__':
    unittest.main()
