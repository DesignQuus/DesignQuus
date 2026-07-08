import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cad.contracts import CadObject
from cad.room_detector import RoomCandidate
from cad.text_room_matcher import TextRoomMatcher


class TextRoomMatcherTests(unittest.TestCase):
    def test_inside_text_matches_room(self):
        room = RoomCandidate('R1','A-ROOM','ROOM_BOUNDARY',[(0,0),(10,0),(10,10),(0,10)],100,(5,5),{'min_x':0,'min_y':0,'max_x':10,'max_y':10},True,False,0.9,{})
        text = CadObject('TEXT','T1','A-ROOM-TEXT',{'type':'POINT','coordinates':[5,5,0]}, text_value='101 회의실')
        result = TextRoomMatcher().match([room],[text])
        self.assertEqual(len(result),1)
        self.assertEqual(result[0].match_method,'INSIDE')
        self.assertEqual(result[0].normalized_text,'회의실')
        self.assertTrue(result[0].selected_as_room_name)

    def test_nested_room_chooses_smallest(self):
        big = RoomCandidate('BIG','A-ROOM','ROOM_BOUNDARY',[(0,0),(20,0),(20,20),(0,20)],400,(10,10),{},True,False,0.9,{})
        small = RoomCandidate('SMALL','A-ROOM','ROOM_BOUNDARY',[(5,5),(15,5),(15,15),(5,15)],100,(10,10),{},True,False,0.9,{})
        text = CadObject('TEXT','T1','A-ROOM-TEXT',{'type':'POINT','coordinates':[10,10,0]}, text_value='기계실')
        result = TextRoomMatcher().match([big,small],[text])
        self.assertEqual(result[0].room_handle,'SMALL')


if __name__ == '__main__':
    unittest.main()
