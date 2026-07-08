import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from space_profile import AttributeCandidate, SpaceProfileResolver


class SpaceProfileResolverTests(unittest.TestCase):
    def setUp(self):
        self.resolver = SpaceProfileResolver()

    def test_user_confirmed_beats_ai(self):
        profile = self.resolver.resolve([
            AttributeCandidate(
                "occupancy_design", 18,
                "AI_EXTRACTION", 0.95,
            ),
            AttributeCandidate(
                "occupancy_design", 20,
                "USER_CONFIRMED", 1.0,
            ),
        ])
        self.assertEqual(
            profile.get("occupancy_design"),
            20,
        )
        self.assertEqual(
            profile.fields["occupancy_design"].source_type,
            "USER_CONFIRMED",
        )

    def test_exact_cad_area_beats_ai(self):
        profile = self.resolver.resolve([
            AttributeCandidate(
                "area_m2", 19.8,
                "AI_EXTRACTION", 0.99,
            ),
            AttributeCandidate(
                "area_m2", 20.0,
                "CAD_EXACT", 1.0,
            ),
        ])
        self.assertEqual(profile.get("area_m2"), 20.0)

    def test_same_priority_conflict_requires_review(self):
        profile = self.resolver.resolve([
            AttributeCandidate(
                "ceiling_height_m", 2.7,
                "USER_CONFIRMED", 1.0,
            ),
            AttributeCandidate(
                "ceiling_height_m", 3.0,
                "USER_CONFIRMED", 1.0,
            ),
        ])
        self.assertEqual(profile.status, "REVIEW_REQUIRED")
        self.assertEqual(len(profile.conflicts), 1)

    def test_volume_is_derived(self):
        profile = self.resolver.resolve([
            AttributeCandidate(
                "area_m2", 20.0,
                "CAD_EXACT", 1.0,
            ),
            AttributeCandidate(
                "ceiling_height_m", 3.0,
                "USER_CONFIRMED", 1.0,
            ),
        ])
        self.assertEqual(profile.get("volume_m3"), 60.0)
        self.assertEqual(
            profile.fields["volume_m3"].source_type,
            "DERIVED",
        )

    def test_missing_required_field(self):
        profile = self.resolver.resolve(
            [
                AttributeCandidate(
                    "area_m2", 20.0,
                    "CAD_EXACT", 1.0,
                )
            ],
            required_fields=["space_type_code", "area_m2"],
        )
        self.assertEqual(profile.status, "REVIEW_REQUIRED")
        self.assertIn(
            "space_type_code",
            profile.missing_fields,
        )


if __name__ == "__main__":
    unittest.main()
