import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.exact_geometry import ExactGeometryEngine


class ExactGeometryTests(unittest.TestCase):
    def setUp(self):
        self.engine = ExactGeometryEngine()

    def test_identical_iou(self):
        a = [(0,0),(2,0),(2,2),(0,2)]
        result = self.engine.exact_iou(a, a)
        self.assertAlmostEqual(result.iou, 1.0)

    def test_disjoint_iou(self):
        a = [(0,0),(1,0),(1,1),(0,1)]
        b = [(2,0),(3,0),(3,1),(2,1)]
        result = self.engine.exact_iou(a, b)
        self.assertEqual(result.iou, 0.0)

    def test_partial_overlap_exact_iou(self):
        a = [(0,0),(2,0),(2,2),(0,2)]
        b = [(1,0),(3,0),(3,2),(1,2)]
        result = self.engine.exact_iou(a, b)
        self.assertAlmostEqual(result.intersection_area, 2.0)
        self.assertAlmostEqual(result.union_area, 6.0)
        self.assertAlmostEqual(result.iou, 1/3)

    def test_valid_polygon_analysis(self):
        result = self.engine.analyze_polygon(
            [(0,0),(5,0),(5,4),(0,4)]
        )
        self.assertEqual(result.status, "VALID")
        self.assertTrue(result.auto_promotable)
        self.assertAlmostEqual(result.area, 20.0)

    def test_bowtie_is_not_silently_valid(self):
        result = self.engine.analyze_polygon(
            [(0,0),(2,2),(0,2),(2,0)]
        )
        self.assertTrue(result.repair_applied)
        self.assertIn(
            result.status,
            {"REPAIRED_SINGLE", "REPAIRED_FRAGMENTED"},
        )


if __name__ == "__main__":
    unittest.main()
