import sys
from pathlib import Path
from datetime import date
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rule_studio import RuleTestRunner, RuleTestCase
from ventilation_rule.engine import VentilationRuleSet


def rule():
    return VentilationRuleSet(
        rule_code="R1",
        version=1,
        name="Test",
        source_code="SRC",
        source_status="CONTENT_VERIFIED",
        rule_status="APPROVED",
        effective_from=date(2026, 1, 1),
        effective_to=None,
        priority=100,
        conditions=[{
            "field": "space_type_code",
            "operator": "eq",
            "value": "CONFERENCE_ROOM"
        }],
        calculation_method="PER_AREA",
        parameters=[{
            "parameter_code": "PER_AREA_M3_H_M2",
            "value_numeric": 4,
            "verification_status": "VERIFIED"
        }],
    )


class RuleTestRunnerTests(unittest.TestCase):
    def test_pass(self):
        result = RuleTestRunner().run(
            rule(),
            [
                RuleTestCase(
                    1,
                    "conference applies",
                    {"space_type_code": "CONFERENCE_ROOM"},
                    {
                        "applicable": True,
                        "calculation_method": "PER_AREA",
                    },
                )
            ],
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(result.status, "PASSED")
        self.assertEqual(result.passed_count, 1)

    def test_fail_diff(self):
        result = RuleTestRunner().run(
            rule(),
            [
                RuleTestCase(
                    1,
                    "wrong expected",
                    {"space_type_code": "OFFICE"},
                    {"applicable": True},
                )
            ],
            reference_date=date(2026, 7, 8),
        )
        self.assertEqual(result.status, "FAILED")
        self.assertIn(
            "applicable",
            result.results[0].diff_json,
        )


if __name__ == "__main__":
    unittest.main()
