import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

export default function DressroomMode() {
  const {
    width, setWidth, height, setHeight, depth, setDepth,
    shelfCount, setShelfCount,
    hangerHeight, setHangerHeight,
    partitionCount, setPartitionCount,
    feetType, setFeetType,
  } = useShelfStore()

  return (
    <>
      <SliderRow label="너비"   value={width}    min={600}  max={2400} step={50}  onChange={setWidth} />
      <SliderRow label="높이"   value={height}   min={1200} max={2400} step={100} onChange={setHeight} />
      <SliderRow label="깊이"   value={depth}    min={400}  max={700}  step={50}  onChange={setDepth} />
      <SliderRow label="선반 수" value={shelfCount} min={0} max={6} step={1} unit="단" onChange={setShelfCount} />
      <div className="border-t border-white/20 my-2 pt-2">
        <span className="text-xs text-white/60 block mb-2">행거 설정</span>
        <SliderRow label="행거봉 높이" value={hangerHeight} min={800} max={2200} step={50} onChange={setHangerHeight} />
        <SliderRow label="파티션 수" value={partitionCount} min={1} max={6} step={1} unit="개" onChange={setPartitionCount} />
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
