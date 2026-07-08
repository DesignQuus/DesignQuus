import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.ai_cad_matcher import AiCadMatcher, approximate_polygon_iou


class AiCadMatcherTests(unittest.TestCase):
    def setUp(self):
        self.matcher = AiCadMatcher.from_json(
            Path(__file__).resolve().parents[3] / 'config' / 'ai-cad-match-policy.v0.6.json'
        )

    def test_identical_polygon_iou(self):
        p = [(0,0),(1,0),(1,1),(0,1)]
        self.assertAlmostEqual(approximate_polygon_iou(p,p,grid_size=32),1.0,places=5)

    def test_clear_auto_match(self):
        ai = {'id':'AI1','polygon':[(0.1,0.1),(0.4,0.1),(0.4,0.4),(0.1,0.4)],'text':'회의실 A'}
        cad = [
            {'id':'C1','polygon':[(0.1,0.1),(0.4,0.1),(0.4,0.4),(0.1,0.4)],'text':'회의실 A','layer_confidence':0.95},
            {'id':'C2','polygon':[(0.6,0.6),(0.9,0.6),(0.9,0.9),(0.6,0.9)],'text':'창고','layer_confidence':0.95},
        ]
        result = self.matcher.match_one(ai,cad)
        self.assertEqual(result[0].cad_id,'C1')
        self.assertEqual(result[0].decision,'AUTO_MATCH')
        self.assertGreater(result[0].gap_to_second,0.1)

    def test_close_candidates_require_review(self):
        ai = {'id':'AI1','polygon':[(0.1,0.1),(0.4,0.1),(0.4,0.4),(0.1,0.4)],'text':'회의실'}
        cad = [
            {'id':'C1','polygon':[(0.1,0.1),(0.4,0.1),(0.4,0.4),(0.1,0.4)],'text':'회의실','layer_confidence':0.9},
            {'id':'C2','polygon':[(0.105,0.105),(0.405,0.105),(0.405,0.405),(0.105,0.405)],'text':'회의실','layer_confidence':0.9},
        ]
        result = self.matcher.match_one(ai,cad)
        self.assertEqual(result[0].decision,'REVIEW_REQUIRED')
        self.assertLess(result[0].gap_to_second,0.1)


if __name__ == '__main__':
    unittest.main()
