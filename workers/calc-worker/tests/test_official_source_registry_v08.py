import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]


class OfficialSourceRegistryTests(unittest.TestCase):
    def test_sources_are_metadata_only(self):
        data = json.loads(
            (
                ROOT / "config/official-ventilation-sources.v0.8.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(data["snapshot_date"], "2026-07-08")
        self.assertGreaterEqual(len(data["sources"]), 3)

        for source in data["sources"]:
            self.assertIn(
                source["status"],
                {"METADATA_ONLY", "CONTENT_VERIFIED"},
            )

    def test_kds_current_metadata_present(self):
        data = json.loads(
            (
                ROOT / "config/official-ventilation-sources.v0.8.json"
            ).read_text(encoding="utf-8")
        )
        codes = {x["source_code"] for x in data["sources"]}
        self.assertIn("KDS-31-25-20-2026", codes)


if __name__ == "__main__":
    unittest.main()
