import sys
from pathlib import Path
import json
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from catalog_import import CatalogImporter


class CatalogImportTests(unittest.TestCase):
    def setUp(self):
        mapping = json.loads(
            (
                ROOT.parents[1]
                / "catalog/mappings/demo-erv-csv-mapping.v0.9.json"
            ).read_text(encoding="utf-8")
        )
        self.importer = CatalogImporter(mapping)

    def test_csv_import_and_units(self):
        result = self.importer.import_csv(
            ROOT.parents[1]
            / "catalog/sample/demo-erv-catalog-v0.9.csv"
        )
        self.assertEqual(result.status, "READY_TO_PUBLISH")
        self.assertEqual(result.valid_count, 3)

        first = result.rows[0].normalized
        self.assertEqual(first["airflow_m3_h"], 600.0)
        self.assertAlmostEqual(
            first["external_static_pressure_pa"],
            15 * 9.80665,
        )
        self.assertEqual(first["power_input_kw"], 0.35)

    def test_duplicate_detection(self):
        rows = [
            {
                "Model": "A",
                "Name": "A",
                "Airflow": "10",
                "ESP": "15",
                "Power": "350",
                "SensibleEff": "75",
                "TotalEff": "65",
                "Voltage": "220",
                "Phase": "1",
                "Noise": "38",
                "Price": "100",
                "LeadDays": "7",
                "Status": "ACTIVE",
            }
        ]
        result = self.importer.import_rows(rows + rows)
        self.assertEqual(result.duplicate_count, 1)
        self.assertEqual(result.status, "REVIEW_REQUIRED")

    def test_invalid_efficiency(self):
        row = {
            "Model": "A",
            "Name": "A",
            "Airflow": "10",
            "ESP": "15",
            "Power": "350",
            "SensibleEff": "175",
            "TotalEff": "65",
            "Voltage": "220",
            "Phase": "1",
            "Noise": "38",
            "Price": "100",
            "LeadDays": "7",
            "Status": "ACTIVE",
        }
        result = self.importer.import_rows([row])
        self.assertEqual(result.error_count, 1)
        self.assertIn(
            "OUT_OF_RANGE:sensible_efficiency_pct",
            result.rows[0].errors,
        )

    def test_json_import(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "catalog.json"
            path.write_text(
                json.dumps([{
                    "Model": "A",
                    "Name": "A",
                    "Airflow": "10",
                    "ESP": "15",
                    "Power": "350",
                    "SensibleEff": "75",
                    "TotalEff": "65",
                    "Voltage": "220",
                    "Phase": "1",
                    "Noise": "38",
                    "Price": "100",
                    "LeadDays": "7",
                    "Status": "ACTIVE",
                }]),
                encoding="utf-8",
            )
            result = self.importer.import_json(path)
            self.assertEqual(result.valid_count, 1)


if __name__ == "__main__":
    unittest.main()
