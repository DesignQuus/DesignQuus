import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.entity_normalizer import (
    normalize_line,
    normalize_text,
    normalize_polyline,
    normalize_block_reference,
)


class NormalizerTests(unittest.TestCase):
    def test_line(self):
        obj = normalize_line(
            handle="10",
            layer="WALL",
            start=(0, 0, 0),
            end=(100, 50, 0),
        )
        self.assertEqual(obj.entity_type, "LINE")
        self.assertEqual(obj.bbox_json["max_x"], 100)

    def test_text(self):
        obj = normalize_text(
            handle="11",
            layer="TEXT",
            text_value="회의실",
            insert=(10, 20, 0),
        )
        obj.validate()
        self.assertEqual(obj.text_value, "회의실")

    def test_closed_polyline_becomes_polygon(self):
        obj = normalize_polyline(
            handle="12",
            layer="ROOM",
            points=[(0, 0, 0), (10, 0, 0), (10, 10, 0), (0, 10, 0)],
            closed=True,
        )
        self.assertEqual(obj.geometry_json["type"], "POLYGON")

    def test_block(self):
        obj = normalize_block_reference(
            handle="13",
            layer="EQUIP",
            block_name="ERV",
            insert=(1, 2, 0),
            rotation_deg=90,
            x_scale=1,
            y_scale=1,
            z_scale=1,
            attribs={"TAG": "ERV-01"},
        )
        obj.validate()
        self.assertEqual(obj.block_name, "ERV")


if __name__ == "__main__":
    unittest.main()
