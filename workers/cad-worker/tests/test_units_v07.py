import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.units import CadUnitResolver, area_to_m2


class UnitResolverTests(unittest.TestCase):
    def setUp(self):
        self.resolver = CadUnitResolver()
        self.bbox = {
            "min_x": 0,
            "min_y": 0,
            "max_x": 50000,
            "max_y": 30000,
        }

    def test_millimeter_header(self):
        result = self.resolver.resolve(
            insunits_code=4,
            bbox=self.bbox,
        )
        self.assertEqual(result.status, "VALIDATED")
        self.assertAlmostEqual(result.meters_per_unit, 0.001)

    def test_meter_header(self):
        result = self.resolver.resolve(
            insunits_code=6,
            bbox=self.bbox,
        )
        self.assertEqual(result.status, "VALIDATED")
        self.assertAlmostEqual(result.meters_per_unit, 1.0)

    def test_inch_header(self):
        result = self.resolver.resolve(
            insunits_code=1,
            bbox=self.bbox,
        )
        self.assertAlmostEqual(
            result.meters_per_unit,
            0.0254,
            places=10,
        )

    def test_unitless_is_review_required(self):
        result = self.resolver.resolve(
            insunits_code=0,
            bbox=self.bbox,
        )
        self.assertEqual(result.status, "REVIEW_REQUIRED")
        self.assertGreater(len(result.candidates), 0)

    def test_area_conversion_mm2_to_m2(self):
        self.assertAlmostEqual(
            area_to_m2(24_000_000, 0.001),
            24.0,
        )

    def test_user_confirmation(self):
        result = self.resolver.confirm(unit_code=4, bbox=self.bbox)
        self.assertEqual(result.status, "USER_CONFIRMED")
        self.assertAlmostEqual(result.meters_per_unit, 0.001)


if __name__ == "__main__":
    unittest.main()
