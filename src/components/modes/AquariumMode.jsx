import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

const TANK_SIZES = [
  { value: '60',  label: '60cm 수조' },
  { value: '90',  label: '90cm 수조' },
  { value: '120', label: '120cm 수조' },
]

const TANK_DIMS = {
  '60':  { width: 600,  depth: 300 },
  '90':  { width: 900,  depth: 450 },
  '120': { width: 1200, depth: 450 },
}

const btnStyle = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer',
  background: active ? '#F97316' : '#F3F4F6',
  color: active ? '#ffffff' : '#6B7280',
})

export default function AquariumMode() {
  const {
    width, setWidth, height, setHeight, depth, setDepth,
    shelfCount, setShelfCount,
    tankSize, setTankSize,
    feetType, setFeetType,
  } = useShelfStore()

  function handleTankSize(size) {
    setTankSize(size)
    const dims = TANK_DIMS[size]
    setWidth(dims.width + 100)
    setDepth(dims.depth + 100)
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>수조 규격</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {TANK_SIZES.map(({ value, label }) => (
            <button key={value} onClick={() => handleTankSize(value)} style={btnStyle(tankSize === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <SliderRow label="너비"   value={width}    min={700}  max={1400} step={50}  onChange={setWidth} />
      <SliderRow label="높이"   value={height}   min={600}  max={2400} step={100} onChange={setHeight} />
      <SliderRow label="깊이"   value={depth}    min={400}  max={600}  step={50}  onChange={setDepth} />
      <SliderRow label="선반 수" value={shelfCount} min={1} max={6} step={1} unit="단" onChange={setShelfCount} />
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
