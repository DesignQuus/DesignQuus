import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rule_studio import RuleCompiler


def draft(**overrides):
    value = {
        "rule_code": "VENT-001",
        "name": "Test Rule",
        "source_code": "SRC",
        "source_clause": "Article 1",
        "effective_from": "2026-01-01",
        "effective_to": None,
        "priority": 100,
        "legal_effect": "ENGINEERING_STANDARD",
        "conditions": [
            {
                "field": "space_type_code",
                "operator": "eq",
                "value": "CONFERENCE_ROOM"
            }
        ],
        "calculation_method": "PER_AREA",
        "parameters": [
            {
                "parameter_code": "PER_AREA_M3_H_M2",
                "value_numeric": 4,
                "unit": "m3/h.m2",
                "source_clause": "Article 1",
                "verification_status": "VERIFIED"
            }
        ]
    }
    value.update(overrides)
    return value


class RuleCompilerTests(unittest.TestCase):
    def setUp(self):
        self.compiler = RuleCompiler()

    def test_valid_compile(self):
        result = self.compiler.compile(
            draft(),
            source_status="CONTENT_VERIFIED",
        )
        self.assertEqual(result.status, "COMPILED")
        self.assertEqual(result.errors, [])

    def test_bad_operator_fails(self):
        d = draft()
        d["conditions"][0]["operator"] = "contains"
        result = self.compiler.compile(
            d,
            source_status="CONTENT_VERIFIED",
        )
        self.assertEqual(result.status, "COMPILE_FAILED")

    def test_metadata_source_warns(self):
        result = self.compiler.compile(
            draft(),
            source_status="METADATA_ONLY",
        )
        codes = {x["code"] for x in result.warnings}
        self.assertIn("SOURCE_CONTENT_NOT_VERIFIED", codes)

    def test_unverified_parameter_warns(self):
        d = draft()
        d["parameters"][0]["verification_status"] = "UNVERIFIED"
        result = self.compiler.compile(
            d,
            source_status="CONTENT_VERIFIED",
        )
        codes = {x["code"] for x in result.warnings}
        self.assertIn("PARAMETER_NOT_VERIFIED", codes)


if __name__ == "__main__":
    unittest.main()
