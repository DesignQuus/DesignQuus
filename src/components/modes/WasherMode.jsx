import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

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
      <div className="border-t border-white/20 my-2 pt-2">
        <span className="text-xs text-white/60 block mb-2">세탁기 규격</span>
        <SliderRow label="세탁기 너비" value={washerWidth}  min={400} max={750} step={10} onChange={setWasherWidth} />
        <SliderRow label="세탁기 높이" value={washerHeight} min={700} max={1100} step={10} onChange={setWasherHeight} />
      </div>
      <div className="flex gap-2 mt-2">
        {[['level', '수평발'], ['caster', '캐스터']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFeetType(val)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${feetType === val ? 'bg-teal-400 text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
            {lbl}
          </button>
        ))}
      </div>
    </>
  )
}
