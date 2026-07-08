import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.transform import (
    CalibrationPoint,
    calibrate_affine,
    transform_points,
    inverse_transform_points,
)


class TransformTests(unittest.TestCase):
    def setUp(self):
        # u = 0.001*x + 0.1, v = 0.002*y + 0.2
        self.points = [
            CalibrationPoint(0, 0, 0.1, 0.2, "A"),
            CalibrationPoint(100, 0, 0.2, 0.2, "B"),
            CalibrationPoint(0, 100, 0.1, 0.4, "C"),
            CalibrationPoint(100, 100, 0.2, 0.4, "D"),
        ]

    def test_affine_calibration(self):
        result = calibrate_affine(self.points)
        self.assertLess(result.rmse, 1e-10)
        self.assertEqual(result.control_point_count, 4)

        page = transform_points(result.matrix, [(50, 50)])
        self.assertAlmostEqual(page[0][0], 0.15, places=10)
        self.assertAlmostEqual(page[0][1], 0.30, places=10)

        cad = inverse_transform_points(result.inverse_matrix, page)
        self.assertAlmostEqual(cad[0][0], 50.0, places=8)
        self.assertAlmostEqual(cad[0][1], 50.0, places=8)

    def test_three_points_minimum(self):
        result = calibrate_affine(self.points[:3])
        self.assertLess(result.rmse, 1e-10)

    def test_two_points_rejected(self):
        with self.assertRaises(ValueError):
            calibrate_affine(self.points[:2])

    def test_collinear_points_rejected(self):
        points = [
            CalibrationPoint(0, 0, 0.0, 0.0),
            CalibrationPoint(1, 1, 0.1, 0.1),
            CalibrationPoint(2, 2, 0.2, 0.2),
        ]
        with self.assertRaises(ValueError):
            calibrate_affine(points)


if __name__ == "__main__":
    unittest.main()
