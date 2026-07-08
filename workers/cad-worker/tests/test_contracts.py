import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.contracts import CadObject


class ContractTests(unittest.TestCase):
    def test_text_requires_value(self):
        with self.assertRaises(ValueError):
            CadObject(
                entity_type="TEXT",
                handle="1",
                layer_name="TEXT",
            ).validate()

    def test_block_requires_name(self):
        with self.assertRaises(ValueError):
            CadObject(
                entity_type="BLOCK_REFERENCE",
                handle="2",
                layer_name="BLOCK",
            ).validate()

    def test_coordinate_space_is_fixed(self):
        with self.assertRaises(ValueError):
            CadObject(
                entity_type="LINE",
                handle="3",
                layer_name="0",
                coordinate_space="PAGE_NORMALIZED",
            ).validate()


if __name__ == "__main__":
    unittest.main()
