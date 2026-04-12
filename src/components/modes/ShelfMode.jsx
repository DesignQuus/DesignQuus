import { useCallback, useState } from 'react'
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

// grid-template-rows 전환: 실제 컨텐츠 높이에 맞게 자동 애니메이션
// max-height 방식과 달리 임의 상한값 불필요 → 모든 섹션 동일한 속도감
const outerGrid = (open) => ({
  display: 'grid',
  gridTemplateRows: open ? '1fr' : '0fr',
  transition: 'grid-template-rows 0.22s ease',
})
const innerClip = { overflow: 'hidden', minHeight: 0 }

// 모드별 샘플 규격 — 나중에 사용자 제공 값으로 교체
const PRESETS = {
  shelf:     null,  // 추후 입력
  washer:    null,
  dressroom: null,
  aquarium:  null,
}

const MODE_LABELS = [
  ['shelf',     '선반시리즈'],
  ['washer',    '세탁기선반'],
  ['dressroom', '드레스룸'],
  ['aquarium',  '축양장'],
]

export default function ShelfMode({ onSpaceRef, onShelfRef, spaceOpen, setSpaceOpen, shelfOpen, setShelfOpen }) {
  const {
    mode, setMode,
    width, setWidth, height, setHeight, depth, setDepth,
    shelfCount, setShelfCount, feetType, setFeetType,
    spaceWidth, setSpaceWidth, spaceHeight, setSpaceHeight, spaceDepth, setSpaceDepth,
    renderMode, setRenderMode,
    shelves, activeShelfId, addShelf, removeShelf, setActiveShelf,
    shelfGap, setShelfGap,
  } = useShelfStore()

  const handleModeSelect = (val) => {
    setMode(val)
    const p = PRESETS[val]
    if (!p) return
    if (p.width      != null) setWidth(p.width)
    if (p.height     != null) setHeight(p.height)
    if (p.depth      != null) setDepth(p.depth)
    if (p.shelfCount != null) setShelfCount(p.shelfCount)
    if (p.feetType   != null) setFeetType(p.feetType)
  }

  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const spaceHeaderRef = useCallback(node => { onSpaceRef?.(node) }, [onSpaceRef])
  const shelfHeaderRef = useCallback(node => { onShelfRef?.(node) }, [onShelfRef])

  return (
    <>
      {/* 설치 가상 공간 */}
      <div className="mb-1">
        <button
          ref={spaceHeaderRef}
          onClick={() => setSpaceOpen(!spaceOpen)}
          className="w-full flex justify-between items-center text-xs font-semibold mb-2"
          style={{ color: '#f97316' }}
        >
          <span>설치 가상 공간</span>
          <IconLines open={spaceOpen} />
        </button>
        <div style={outerGrid(spaceOpen)}>
          <div style={innerClip}>
            {/* 제품 시리즈 선택 */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {MODE_LABELS.map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => handleModeSelect(val)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all
                    ${mode === val
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                    }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <SliderRow label="공간 너비" value={spaceWidth}  min={300} max={3000} step={50}  onChange={setSpaceWidth} />
            <SliderRow label="공간 높이" value={spaceHeight} min={600} max={3000} step={100} onChange={setSpaceHeight} />
            <SliderRow label="공간 깊이" value={spaceDepth}  min={300} max={1500} step={50}  onChange={setSpaceDepth} />
            <SliderRow label="선반 간격" value={shelfGap}    min={0}   max={500}  step={25}   onChange={setShelfGap} />
          </div>
        </div>
      </div>

      {/* 선반 규격 */}
      <div className="border-t border-white/20 pt-3 mt-1">
        <button
          ref={shelfHeaderRef}
          onClick={() => setShelfOpen(!shelfOpen)}
          className="w-full flex justify-between items-center text-xs font-semibold mb-2"
          style={{ color: '#f97316' }}
        >
          <span>선반 규격</span>
          <IconLines open={shelfOpen} />
        </button>
        <div style={outerGrid(shelfOpen)}>
          <div style={innerClip}>
            <SliderRow label="너비" value={width}  min={300} max={1800} step={50}  onChange={setWidth} />
            <SliderRow label="높이" value={height} min={600} max={2400} step={100} onChange={setHeight} />
            <SliderRow label="깊이" value={depth}  min={300} max={900}  step={50}  onChange={setDepth} />
            <SliderRow
              label="단 / 칸 수"
              value={shelfCount}
              min={1} max={10} step={1}
              badge={`${shelfCount + 1}단 / ${shelfCount + 2}칸`}
              onChange={setShelfCount}
            />
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

            {/* 선반 인스턴스 탭 */}
            <div className="mt-3">
              <span className="text-xs font-medium text-white/60 block mb-1.5">선반 목록</span>
              <div className="flex flex-wrap gap-1">
                {shelves.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveShelf(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px 3px 10px',
                      borderRadius: 8,
                      fontSize: 11, fontWeight: 600,
                      background: s.id === activeShelfId ? '#f97316' : 'rgba(255,255,255,0.18)',
                      color: s.id === activeShelfId ? 'white' : 'rgba(255,255,255,0.75)',
                      transition: 'all 0.15s',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {s.label}
                    {shelves.length > 1 && (
                      <span
                        onClick={e => { e.stopPropagation(); removeShelf(s.id) }}
                        style={{
                          fontSize: 12, lineHeight: 1, opacity: 0.7,
                          padding: '0 2px', borderRadius: 3,
                          cursor: 'pointer',
                        }}
                      >×</span>
                    )}
                  </button>
                ))}
                {/* 복제 버튼 */}
                <button
                  onClick={addShelf}
                  style={{
                    padding: '3px 10px', borderRadius: 8,
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px dashed rgba(255,255,255,0.3)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  title="현재 선반 복제"
                >+ 복제</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
