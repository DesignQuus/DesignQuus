import sys
from pathlib import Path
import unittest

WORKER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORKER_ROOT))

from drawing import MockDrawingRecognitionAdapter, RecognitionRequest, validate_result, RecognitionResult


class DrawingAdapterTests(unittest.TestCase):
    def test_mock_adapter_contract(self):
        result = MockDrawingRecognitionAdapter().recognize(
            RecognitionRequest(
                request_id='r1', file_url='file:///demo.pdf', file_type='PDF',
                pages=[1], requested_objects=['ROOM'],
            )
        )
        self.assertEqual(len(result.objects), 2)
        self.assertEqual(result.objects[0]['coordinate_space'], 'PAGE_NORMALIZED')

    def test_out_of_range_geometry_is_rejected(self):
        bad = RecognitionResult(
            adapter='BAD', model=None,
            objects=[{
                'confidence_score': 0.9,
                'coordinate_space': 'PAGE_NORMALIZED',
                'normalized_geometry': {'type': 'RECT', 'x': 0.9, 'y': 0.1, 'width': 0.2, 'height': 0.2},
            }],
        )
        with self.assertRaises(ValueError):
            validate_result(bad)


if __name__ == '__main__':
    unittest.main()
