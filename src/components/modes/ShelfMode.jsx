import { useState } from 'react'
import SliderRow from '../ui/SliderRow.jsx'
import useShelfStore from '../../store/useShelfStore.js'

// 3선 토글 아이콘
function IconLines({ open }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
      <rect x="0" y="0"   width="14" height="1.8" rx="0.9"/>
      <rect x={open ? "2" : "0"} y="5.1" width={open ? "12" : "14"} height="1.8" rx="0.9"/>
      <rect x="0" y="10.2" width="14" height="1.8" rx="0.9"/>
    </svg>
  )
}

export default function ShelfMode() {
  const [spaceOpen, setSpaceOpen] = useState(true)
  const [shelfOpen, setShelfOpen] = useState(false)

  const {
    width, setWidth,
    height, setHeight,
    depth, setDepth,
    shelfCount, setShelfCount,
    feetType, setFeetType,
    spaceWidth, setSpaceWidth,
    spaceHeight, setSpaceHeight,
    spaceDepth, setSpaceDepth,
    postColor, setPostColor,
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
          <IconLines open={spaceOpen} />
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
          <IconLines open={shelfOpen} />
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

            {/* 포스트 색상 */}
            <div className="mt-3">
              <span className="text-xs font-medium text-white/90 block mb-2">포스트 색상</span>
              <div className="flex gap-3">
                {[
                  { val: 'black', label: '검정', bg: '#1a1a1a', ring: '#f97316' },
                  { val: 'white', label: '흰색', bg: '#e8e8e8', ring: '#f97316' },
                ].map(({ val, label, bg }) => (
                  <button
                    key={val}
                    onClick={() => setPostColor(val)}
                    title={label}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: bg,
                      border: postColor === val ? '2.5px solid #f97316' : '2px solid rgba(255,255,255,0.25)',
                      boxShadow: postColor === val ? '0 0 0 2px rgba(249,115,22,0.35)' : 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
