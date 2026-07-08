import sys
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import ezdxf

from cad.dxf_adapter import DxfAdapter
from cad.exact_room_detector import ExactRoomDetector
from cad.layer_classifier import LayerClassifier
from cad.units import CadUnitResolver


class V07DxfRuntimeTests(unittest.TestCase):
    def test_mm_dxf_room_exact_area(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "room-mm.dxf"

            doc = ezdxf.new("R2018")
            doc.header["$INSUNITS"] = 4
            doc.layers.add("A-ROOM")

            msp = doc.modelspace()
            msp.add_lwpolyline(
                [(0,0),(5000,0),(5000,4000),(0,4000)],
                close=True,
                dxfattribs={"layer": "A-ROOM"},
            )
            doc.saveas(path)

            imported = DxfAdapter().read(path)
            self.assertEqual(imported.source_unit_code, 4)

            bbox = {
                "min_x": 0,
                "min_y": 0,
                "max_x": 5000,
                "max_y": 4000,
            }
            unit = CadUnitResolver().resolve(
                insunits_code=imported.source_unit_code,
                bbox=bbox,
            )

            classifier = LayerClassifier.from_json(
                ROOT.parents[1] / "config/cad-layer-classifier.v0.6.json"
            )
            layers = classifier.classify(imported.objects)
            layer_map = {x.layer_name: x for x in layers}

            rooms = ExactRoomDetector(
                min_area_m2=1.0
            ).detect(
                imported.objects,
                layer_map,
                unit,
            )

            self.assertEqual(len(rooms), 1)
            self.assertAlmostEqual(rooms[0].area_m2, 20.0)
            self.assertEqual(
                rooms[0].geometry_quality_status,
                "VALID",
            )


if __name__ == "__main__":
    unittest.main()
