import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.contracts import CadObject
from cad.exact_room_detector import ExactRoomDetector
from cad.layer_classifier import LayerClassification
from cad.units import CadUnitResolver


class ExactRoomDetectorTests(unittest.TestCase):
    def test_mm_room_becomes_m2(self):
        room = CadObject(
            entity_type="LWPOLYLINE",
            handle="R1",
            layer_name="A-ROOM",
            geometry_json={
                "type": "POLYGON",
                "coordinates": [[
                    [0,0,0],
                    [5000,0,0],
                    [5000,4000,0],
                    [0,4000,0],
                    [0,0,0],
                ]],
            },
            attributes={"closed": True},
        )
        layer = LayerClassification(
            layer_name="A-ROOM",
            category="ROOM_BOUNDARY",
            confidence_score=0.95,
            score_breakdown={},
            matched_rules=[],
            object_count=1,
            entity_histogram={"LWPOLYLINE": 1},
        )
        unit = CadUnitResolver().resolve(
            insunits_code=4,
            bbox={
                "min_x":0,"min_y":0,
                "max_x":5000,"max_y":4000,
            },
        )

        result = ExactRoomDetector(min_area_m2=1).detect(
            [room],
            {"A-ROOM": layer},
            unit,
        )

        self.assertEqual(len(result), 1)
        self.assertAlmostEqual(result[0].area_m2, 20.0)
        self.assertEqual(
            result[0].geometry_quality_status,
            "VALID",
        )
        self.assertTrue(result[0].auto_promotable)

    def test_unvalidated_unit_rejected(self):
        unit = CadUnitResolver().resolve(
            insunits_code=0,
            bbox={
                "min_x":0,"min_y":0,
                "max_x":5000,"max_y":4000,
            },
        )
        with self.assertRaises(ValueError):
            ExactRoomDetector().detect([], {}, unit)


if __name__ == "__main__":
    unittest.main()
