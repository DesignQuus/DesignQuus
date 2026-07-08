import sys
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.dwg_converter import (
    MockDwgConverterAdapter,
    CommandTemplateDwgConverterAdapter,
)


class DwgConverterTests(unittest.TestCase):
    def test_mock_copy(self):
        with tempfile.TemporaryDirectory() as td:
            td = Path(td)
            src = td / "sample.dxf"
            src.write_text("fixture", encoding="utf-8")
            out = td / "out"
            result = MockDwgConverterAdapter().convert(src, out)
            self.assertTrue(result.exists())
            self.assertEqual(result.read_text(encoding="utf-8"), "fixture")

    def test_template_required(self):
        with self.assertRaises(ValueError):
            CommandTemplateDwgConverterAdapter(template="")


if __name__ == "__main__":
    unittest.main()
