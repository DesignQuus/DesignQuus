import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

const btnStyle = (active) => ({
  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer',
  background: active ? '#F97316' : '#F3F4F6',
  color: active ? '#ffffff' : '#6B7280',
})

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
      <div style={{ borderTop: '1px solid #F3F4F6', margin: '8px 0', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>행거 설정</span>
        <SliderRow label="행거봉 높이" value={hangerHeight} min={800} max={2200} step={50} onChange={setHangerHeight} />
        <SliderRow label="파티션 수" value={partitionCount} min={1} max={6} step={1} unit="개" onChange={setPartitionCount} />
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
