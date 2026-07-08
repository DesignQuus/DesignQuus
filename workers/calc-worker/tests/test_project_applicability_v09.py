import sys
from pathlib import Path
from datetime import date
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rule_studio import ProjectApplicabilityAnalyzer
from ventilation_rule.engine import VentilationRuleSet


def rule(**overrides):
    data = dict(
        rule_code="R1",
        version=1,
        name="Test",
        source_code="SRC",
        source_status="CONTENT_VERIFIED",
        rule_status="APPROVED",
        effective_from=date(2026, 1, 1),
        effective_to=None,
        priority=100,
        conditions=[
            {
                "field": "space_type_code",
                "operator": "eq",
                "value": "CONFERENCE_ROOM"
            },
            {
                "field": "occupancy_design",
                "operator": "gte",
                "value": 20
            }
        ],
        calculation_method="PER_AREA",
        parameters=[{
            "parameter_code": "PER_AREA_M3_H_M2",
            "value_numeric": 4,
            "verification_status": "VERIFIED"
        }],
    )
    data.update(overrides)
    return VentilationRuleSet(**data)


class ApplicabilityTests(unittest.TestCase):
    def setUp(self):
        self.engine = ProjectApplicabilityAnalyzer()

    def test_applicable(self):
        result = self.engine.analyze(
            [rule()],
            {
                "space_type_code": "CONFERENCE_ROOM",
                "occupancy_design": 30,
            },
            reference_date=date(2026, 7, 8),
        )[0]
        self.assertEqual(result.status, "APPLICABLE")

    def test_missing_input_reviews(self):
        result = self.engine.analyze(
            [rule()],
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )[0]
        self.assertEqual(result.status, "REVIEW_REQUIRED")
        self.assertIn("occupancy_design", result.missing_inputs)

    def test_failed_condition_not_applicable(self):
        result = self.engine.analyze(
            [rule()],
            {
                "space_type_code": "OFFICE",
                "occupancy_design": 30,
            },
            reference_date=date(2026, 7, 8),
        )[0]
        self.assertEqual(result.status, "NOT_APPLICABLE")

    def test_unapproved_rule_blocked(self):
        result = self.engine.analyze(
            [rule(rule_status="DRAFT")],
            {
                "space_type_code": "CONFERENCE_ROOM",
                "occupancy_design": 30,
            },
            reference_date=date(2026, 7, 8),
        )[0]
        self.assertEqual(result.status, "BLOCKED")


if __name__ == "__main__":
    unittest.main()
