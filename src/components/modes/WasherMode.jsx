import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

const btnStyle = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer',
  background: active ? '#F97316' : '#F3F4F6',
  color: active ? '#ffffff' : '#6B7280',
})

export default function WasherMode() {
  const {
    width, setWidth, height, setHeight, depth, setDepth,
    feetType, setFeetType,
    washerWidth, setWasherWidth,
    washerHeight, setWasherHeight,
  } = useShelfStore()

  return (
    <>
      <SliderRow label="선반 너비" value={width}  min={500} max={1200} step={50} onChange={setWidth} />
      <SliderRow label="선반 높이" value={height} min={600} max={1800} step={100} onChange={setHeight} />
      <SliderRow label="선반 깊이" value={depth}  min={400} max={700}  step={50}  onChange={setDepth} />
      <div style={{ borderTop: '1px solid #F3F4F6', margin: '8px 0', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>세탁기 규격</span>
        <SliderRow label="세탁기 너비" value={washerWidth}  min={400} max={750} step={10} onChange={setWasherWidth} />
        <SliderRow label="세탁기 높이" value={washerHeight} min={700} max={1100} step={10} onChange={setWasherHeight} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {[['level', '수평발'], ['caster', '캐스터']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFeetType(val)} style={btnStyle(feetType === val)}>
            {lbl}
          </button>
        ))}
      </div>
    </>
  )
}
