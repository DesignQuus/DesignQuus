import sys
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ventilation import VentilationInput, calculate_ventilation_flow

class VentilationCalculatorTests(unittest.TestCase):
    def test_per_person(self):
        r = calculate_ventilation_flow(VentilationInput(method="PER_PERSON", occupancy_people=10, per_person_m3_h=25))
        self.assertEqual(r.required_flow_m3_h, 250)
    def test_per_area(self):
        r = calculate_ventilation_flow(VentilationInput(method="PER_AREA", area_m2=100, per_area_m3_h_m2=3))
        self.assertEqual(r.required_flow_m3_h, 300)
    def test_ach(self):
        r = calculate_ventilation_flow(VentilationInput(method="ACH", volume_m3=500, air_changes_per_hour=2))
        self.assertEqual(r.required_flow_m3_h, 1000)
    def test_max_of(self):
        r = calculate_ventilation_flow(VentilationInput(method="MAX_OF", occupancy_people=20, per_person_m3_h=25, area_m2=100, per_area_m3_h_m2=4))
        self.assertEqual(r.required_flow_m3_h, 500)
        self.assertEqual(r.governing_contributor, "PER_PERSON")
    def test_sum_of(self):
        r = calculate_ventilation_flow(VentilationInput(method="SUM_OF", occupancy_people=20, per_person_m3_h=25, area_m2=100, per_area_m3_h_m2=4))
        self.assertEqual(r.required_flow_m3_h, 900)
    def test_negative_value_rejected(self):
        with self.assertRaises(ValueError):
            calculate_ventilation_flow(VentilationInput(method="PER_AREA", area_m2=-1, per_area_m3_h_m2=3))
