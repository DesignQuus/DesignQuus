import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.space_promotion import (
    SpacePromotionInput,
    SpacePromotionPlanner,
)


class SpacePromotionTests(unittest.TestCase):
    def setUp(self):
        self.planner = SpacePromotionPlanner()
        self.geometry = {
            "type": "Polygon",
            "coordinates": [[
                [0,0],[5,0],[5,4],[0,4],[0,0]
            ]],
        }

    def base(self, **overrides):
        data = dict(
            room_candidate_id="ROOM-1",
            room_status="ACCEPTED",
            unit_status="VALIDATED",
            space_code="B1-R001",
            room_name="회의실",
            space_type_code="CONFERENCE_ROOM",
            area_m2=20.0,
            geometry_geojson=self.geometry,
            geometry_quality_status="VALID",
            auto_promotable=True,
            ai_cad_match_decision="AUTO_MATCH",
            require_ai_cad_match=False,
        )
        data.update(overrides)
        return SpacePromotionInput(**data)

    def test_ready(self):
        plan = self.planner.plan(self.base())
        self.assertEqual(plan.decision, "READY")
        self.assertEqual(plan.blockers, [])
        self.assertEqual(
            plan.geometry_coordinate_space,
            "MODEL_LOCAL_M",
        )

    def test_unit_review_blocks(self):
        plan = self.planner.plan(
            self.base(unit_status="REVIEW_REQUIRED")
        )
        self.assertEqual(plan.decision, "BLOCKED")
        self.assertIn("UNIT_NOT_VALIDATED", plan.blockers)

    def test_fragmented_geometry_blocks(self):
        plan = self.planner.plan(
            self.base(
                geometry_quality_status="REPAIRED_FRAGMENTED",
                auto_promotable=False,
            )
        )
        self.assertEqual(plan.decision, "BLOCKED")
        self.assertIn(
            "GEOMETRY_NOT_AUTOPROMOTABLE",
            plan.blockers,
        )

    def test_ambiguous_ai_match_reviews_when_required(self):
        plan = self.planner.plan(
            self.base(
                require_ai_cad_match=True,
                ai_cad_match_decision="REVIEW_REQUIRED",
            )
        )
        self.assertEqual(plan.decision, "REVIEW_REQUIRED")
        self.assertIn(
            "AI_CAD_MATCH_AMBIGUOUS",
            plan.blockers,
        )


if __name__ == "__main__":
    unittest.main()
