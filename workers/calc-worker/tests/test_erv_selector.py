import sys
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from selection import ErvProduct, SelectionRequirement, select_erv_candidates

class ErvSelectorTests(unittest.TestCase):
    def test_small_unit_rejected(self):
        products = [ErvProduct("SMALL",500,100,0.3,1000,5), ErvProduct("FIT",1000,200,0.6,1500,7)]
        result = select_erv_candidates(products, SelectionRequirement(required_flow_m3_h=800, required_static_pressure_pa=150))
        by_code = {x["product"]["model_code"]: x for x in result}
        self.assertFalse(by_code["SMALL"]["technically_valid"])
        self.assertTrue(by_code["FIT"]["technically_valid"])
    def test_valid_candidates_ranked(self):
        products = [ErvProduct("A",1000,200,0.6,1500,7), ErvProduct("B",1200,250,0.8,1700,10)]
        result = select_erv_candidates(products, SelectionRequirement(required_flow_m3_h=900, required_static_pressure_pa=150))
        valid = [x for x in result if x["technically_valid"]]
        self.assertEqual([x["rank"] for x in valid], [1,2])
