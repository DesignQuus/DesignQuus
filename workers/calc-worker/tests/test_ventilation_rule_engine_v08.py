import sys
from pathlib import Path
from datetime import date
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ventilation_rule.engine import (
    VentilationRuleEngine,
    VentilationRuleSet,
)


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
                "value": "CONFERENCE_ROOM",
            }
        ],
        calculation_method="PER_AREA",
        parameters=[
            {
                "parameter_code": "PER_AREA_M3_H_M2",
                "value_numeric": 4,
                "verification_status": "VERIFIED",
            }
        ],
    )
    data.update(overrides)
    return VentilationRuleSet(**data)


class VentilationRuleEngineTests(unittest.TestCase):
    def test_approved_verified_rule_selected(self):
        result = VentilationRuleEngine([rule()]).select(
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(result.status, "SELECTED")
        self.assertEqual(
            result.selected_rule.rule_code,
            "R1",
        )

    def test_metadata_only_source_blocks(self):
        result = VentilationRuleEngine([
            rule(source_status="METADATA_ONLY")
        ]).select(
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(result.status, "BLOCKED")
        self.assertIn(
            "VENTILATION_PARAMETER_UNVERIFIED",
            result.blockers,
        )

    def test_unverified_parameter_blocks(self):
        r = rule(parameters=[
            {
                "parameter_code": "PER_AREA_M3_H_M2",
                "value_numeric": 4,
                "verification_status": "UNVERIFIED",
            }
        ])
        result = VentilationRuleEngine([r]).select(
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )
        self.assertIn(
            "VENTILATION_PARAMETER_UNVERIFIED",
            result.blockers,
        )

    def test_future_rule_not_selected(self):
        result = VentilationRuleEngine([
            rule(effective_from=date(2027, 1, 1))
        ]).select(
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )
        self.assertIn(
            "VENTILATION_RULE_NOT_FOUND",
            result.blockers,
        )

    def test_higher_priority_selected(self):
        result = VentilationRuleEngine([
            rule(rule_code="LOW", priority=10),
            rule(rule_code="HIGH", priority=200),
        ]).select(
            {"space_type_code": "CONFERENCE_ROOM"},
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(
            result.selected_rule.rule_code,
            "HIGH",
        )


if __name__ == "__main__":
    unittest.main()
