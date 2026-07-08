import sys
from pathlib import Path
from datetime import date
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pipeline import SpaceVentilationPipeline
from space_profile import AttributeCandidate, SpaceProfileResolver
from ventilation_rule import VentilationRuleEngine


class SpaceVentilationPipelineTests(unittest.TestCase):
    def setUp(self):
        self.rule_engine = VentilationRuleEngine.from_json(
            ROOT.parents[1] / "config/ventilation-rule-set.demo.v0.8.json"
        )
        self.pipeline = SpaceVentilationPipeline(
            profile_resolver=SpaceProfileResolver(),
            rule_engine=self.rule_engine,
        )

    def candidates(self):
        return [
            AttributeCandidate(
                "space_type_code",
                "CONFERENCE_ROOM",
                "USER_CONFIRMED",
                1.0,
            ),
            AttributeCandidate(
                "area_m2",
                20.0,
                "CAD_EXACT",
                1.0,
            ),
            AttributeCandidate(
                "occupancy_design",
                20,
                "USER_CONFIRMED",
                1.0,
            ),
            AttributeCandidate(
                "ceiling_height_m",
                3.0,
                "USER_CONFIRMED",
                1.0,
            ),
        ]

    def test_space_to_required_flow(self):
        result = self.pipeline.run(
            self.candidates(),
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(
            result.status,
            "READY_FOR_SELECTION",
        )
        self.assertEqual(
            result.calculation["required_flow_m3_h"],
            500.0,
        )
        self.assertEqual(
            result.selection_requirement["required_flow_m3_h"],
            500.0,
        )

    def test_volume_derived_in_pipeline(self):
        result = self.pipeline.run(
            self.candidates(),
            reference_date=date(2026, 7, 8),
        )
        volume = result.profile["fields"]["volume_m3"]["value"]
        self.assertEqual(volume, 60.0)

    def test_profile_conflict_stops_rule(self):
        candidates = self.candidates() + [
            AttributeCandidate(
                "occupancy_design",
                30,
                "USER_CONFIRMED",
                1.0,
            )
        ]
        result = self.pipeline.run(
            candidates,
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(
            result.status,
            "REVIEW_REQUIRED",
        )
        self.assertIsNone(result.calculation)

    def test_missing_occupancy_uses_area_contributor(self):
        candidates = [
            c for c in self.candidates()
            if c.field_code != "occupancy_design"
        ]
        result = self.pipeline.run(
            candidates,
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(
            result.status,
            "READY_FOR_SELECTION",
        )
        self.assertEqual(
            result.calculation["required_flow_m3_h"],
            80.0,
        )


if __name__ == "__main__":
    unittest.main()
