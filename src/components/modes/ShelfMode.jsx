import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

const btnStyle = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer',
  background: active ? '#F97316' : '#F3F4F6',
  color: active ? '#ffffff' : '#6B7280',
})

export default function ShelfMode() {
  const {
    width, setWidth,
    height, setHeight,
    depth, setDepth,
    shelfCount, setShelfCount,
    feetType, setFeetType,
  } = useShelfStore()

  return (
    <>
      <SliderRow label="너비" value={width}  min={300} max={1800} step={50}  onChange={setWidth} />
      <SliderRow label="높이" value={height} min={600} max={2400} step={100} onChange={setHeight} />
      <SliderRow label="깊이" value={depth}  min={300} max={900}  step={50}  onChange={setDepth} />
      <SliderRow label="선반 수" value={shelfCount} min={1} max={10} step={1} unit="단" onChange={setShelfCount} />

      <div style={{ marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>바닥 발</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['level', '수평발'], ['caster', '캐스터']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFeetType(val)} style={btnStyle(feetType === val)}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
