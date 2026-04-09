import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

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

      <div className="mt-3">
        <span className="text-xs font-medium text-white/90 block mb-2">바닥 발</span>
        <div className="flex gap-2">
          {[['level', '수평발'], ['caster', '캐스터']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFeetType(val)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                ${feetType === val
                  ? 'bg-teal-400 text-white shadow-md'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
