import { useState } from 'react'
import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

export default function ShelfMode() {
  const [spaceOpen, setSpaceOpen] = useState(false)
  const [shelfOpen, setShelfOpen] = useState(true)

  const {
    width, setWidth,
    height, setHeight,
    depth, setDepth,
    shelfCount, setShelfCount,
    feetType, setFeetType,
    spaceWidth, setSpaceWidth,
    spaceHeight, setSpaceHeight,
    spaceDepth, setSpaceDepth,
  } = useShelfStore()

  return (
    <>
      {/* 설치 가상 공간 */}
      <div className="mb-1">
        <button
          onClick={() => setSpaceOpen(v => !v)}
          className="w-full flex justify-between items-center text-xs font-semibold text-white/60 mb-2"
        >
          <span>📐 설치 가상 공간</span>
          <span>{spaceOpen ? '▲' : '▼'}</span>
        </button>
        {spaceOpen && (
          <>
            <SliderRow label="공간 너비" value={spaceWidth}  min={300} max={3000} step={50}  onChange={setSpaceWidth} />
            <SliderRow label="공간 높이" value={spaceHeight} min={600} max={3000} step={100} onChange={setSpaceHeight} />
            <SliderRow label="공간 깊이" value={spaceDepth}  min={300} max={1500} step={50}  onChange={setSpaceDepth} />
          </>
        )}
      </div>

      {/* 선반 규격 */}
      <div className="border-t border-white/20 pt-3 mt-1">
        <button
          onClick={() => setShelfOpen(v => !v)}
          className="w-full flex justify-between items-center text-xs font-semibold text-white/60 mb-2"
        >
          <span>🏗 선반 규격</span>
          <span>{shelfOpen ? '▲' : '▼'}</span>
        </button>
        {shelfOpen && (
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
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-white/20 text-white/80 hover:bg-white/30'
                      }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
