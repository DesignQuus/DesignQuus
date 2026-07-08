import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.transform_geometry import cad_geometry_to_page


class TransformGeometryTests(unittest.TestCase):
    def test_line_to_polyline(self):
        matrix = [
            [0.01, 0.0, 0.0],
            [0.0, 0.01, 0.0],
            [0.0, 0.0, 1.0],
        ]
        geometry = {
            "type": "LINESTRING",
            "coordinates": [[10, 10, 0], [20, 20, 0]],
        }
        result = cad_geometry_to_page(
            geometry, matrix, require_in_page=True
        )
        self.assertEqual(result["type"], "POLYLINE")
        self.assertEqual(result["points"][0], [0.1, 0.1])

    def test_out_of_page_rejected(self):
        matrix = [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
        ]
        geometry = {
            "type": "POINT",
            "coordinates": [2, 2, 0],
        }
        with self.assertRaises(ValueError):
            cad_geometry_to_page(
                geometry, matrix, require_in_page=True
            )


if __name__ == "__main__":
    unittest.main()
