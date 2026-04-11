import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

const TANK_SIZES = [
  { value: '60',  label: '60cm 수조' },
  { value: '90',  label: '90cm 수조' },
  { value: '120', label: '120cm 수조' },
]

// Standard aquarium dimensions (mm)
const TANK_DIMS = {
  '60':  { width: 600,  depth: 300 },
  '90':  { width: 900,  depth: 450 },
  '120': { width: 1200, depth: 450 },
}

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
      <div className="mb-3">
        <span className="text-xs text-white/60 block mb-2">수조 규격</span>
        <div className="grid grid-cols-3 gap-1">
          {TANK_SIZES.map(({ value, label }) => (
            <button key={value} onClick={() => handleTankSize(value)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all
                ${tankSize === value ? 'bg-orange-500 text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <SliderRow label="너비"   value={width}    min={700}  max={1400} step={50}  onChange={setWidth} />
      <SliderRow label="높이"   value={height}   min={600}  max={2400} step={100} onChange={setHeight} />
      <SliderRow label="깊이"   value={depth}    min={400}  max={600}  step={50}  onChange={setDepth} />
      <SliderRow label="선반 수" value={shelfCount} min={1} max={6} step={1} unit="단" onChange={setShelfCount} />
      <div className="flex gap-2 mt-2">
        {[['level', '수평발'], ['caster', '캐스터']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFeetType(val)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${feetType === val ? 'bg-orange-500 text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
            {lbl}
          </button>
        ))}
      </div>
    </>
  )
}
