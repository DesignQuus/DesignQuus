import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.ai_cad_matcher_v07 import ExactAiCadMatcher


POLICY = {
    "weights": {
        "geometry_iou": 0.45,
        "centroid_proximity": 0.20,
        "area_similarity": 0.15,
        "text_similarity": 0.15,
        "layer_confidence": 0.05
    },
    "thresholds": {
        "auto_match_min_score": 0.85,
        "auto_match_min_gap_to_second": 0.10,
        "review_min_score": 0.65
    },
    "centroid_distance_full_score": 0.02,
    "centroid_distance_zero_score": 0.25
}


class ExactMatcherTests(unittest.TestCase):
    def test_exact_match(self):
        matcher = ExactAiCadMatcher(POLICY)
        ai = {
            "id": "AI-1",
            "polygon": [(0,0),(0.4,0),(0.4,0.4),(0,0.4)],
            "text": "회의실",
        }
        cad_rooms = [
            {
                "id": "CAD-1",
                "polygon": [(0,0),(0.4,0),(0.4,0.4),(0,0.4)],
                "text": "회의실",
                "layer_confidence": 0.95,
            },
            {
                "id": "CAD-2",
                "polygon": [(0.6,0.6),(0.9,0.6),(0.9,0.9),(0.6,0.9)],
                "text": "창고",
                "layer_confidence": 0.95,
            },
        ]
        result = matcher.match_one(ai, cad_rooms)
        self.assertEqual(result[0].decision, "AUTO_MATCH")
        self.assertAlmostEqual(result[0].geometry_iou, 1.0)
        self.assertEqual(
            result[0].geometry_engine,
            "SHAPELY_GEOS_EXACT/0.7.0",
        )


if __name__ == "__main__":
    unittest.main()
