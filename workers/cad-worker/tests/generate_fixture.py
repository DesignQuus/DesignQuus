from pathlib import Path
import ezdxf


def generate(path: Path) -> None:
    doc = ezdxf.new('R2013')
    doc.units = 4  # millimeters
    msp = doc.modelspace()

    for layer in ['A-ROOM', 'A-ROOM-TEXT', 'A-WALL', 'M-HVAC-EQUIP']:
        if layer not in doc.layers:
            doc.layers.add(layer)

    # Room A: 6000 x 4000 mm
    msp.add_lwpolyline(
        [(0, 0), (6000, 0), (6000, 4000), (0, 4000)],
        close=True,
        dxfattribs={'layer': 'A-ROOM'},
    )
    msp.add_text('회의실 A', dxfattribs={'layer': 'A-ROOM-TEXT', 'height': 250}).set_placement((3000, 2000))

    # Room B: 5000 x 4000 mm
    msp.add_lwpolyline(
        [(6500, 0), (11500, 0), (11500, 4000), (6500, 4000)],
        close=True,
        dxfattribs={'layer': 'A-ROOM'},
    )
    msp.add_text('사무실 B', dxfattribs={'layer': 'A-ROOM-TEXT', 'height': 250}).set_placement((9000, 2000))

    # Open polyline: not a room
    msp.add_lwpolyline(
        [(0, 5000), (3000, 5000), (3000, 7000)],
        close=False,
        dxfattribs={'layer': 'A-WALL'},
    )

    # HVAC block
    block = doc.blocks.new(name='ERV_UNIT')
    block.add_lwpolyline([(0,0),(800,0),(800,500),(0,500)], close=True)
    insert = msp.add_blockref('ERV_UNIT', (2000, 6000), dxfattribs={'layer': 'M-HVAC-EQUIP'})
    insert.add_attrib('TAG', 'ERV-01', insert=(2000, 6000))

    doc.saveas(path)


if __name__ == '__main__':
    target = Path(__file__).resolve().parent / 'fixtures' / 'semantic_rooms.dxf'
    target.parent.mkdir(parents=True, exist_ok=True)
    generate(target)
    print(target)
