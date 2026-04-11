import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useShelfStore from '../../store/useShelfStore.js'
import { generateDimensionCanvas, downloadDimensionPNG } from '../../utils/dimensionDrawing.js'
import ShelfMode from '../modes/ShelfMode.jsx'
import WasherMode from '../modes/WasherMode.jsx'
import DressroomMode from '../modes/DressroomMode.jsx'
import AquariumMode from '../modes/AquariumMode.jsx'
import BomPanel from './BomPanel.jsx'
import CameraPresetButtons from './CameraPresets.jsx'

const MODE_PANELS = {
  shelf:     ShelfMode,
  washer:    WasherMode,
  dressroom: DressroomMode,
  aquarium:  AquariumMode,
}

function useDraggable(initialPos) {
  const [pos, setPos] = useState(initialPos)
  const posRef = useRef(pos)
  posRef.current = pos
  const headerRef = useRef(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    function onMouseDown(e) {
      // input/select 은 제외, button은 드래그 허용 (클릭은 정상 동작)
      if (e.target.closest('input, select')) return
      e.preventDefault()
      const startX = e.clientX - posRef.current.x
      const startY = e.clientY - posRef.current.y

      function onMove(ev) {
        const x = Math.max(0, Math.min(window.innerWidth - 288, ev.clientX - startX))
        const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - startY))
        setPos({ x, y })
        posRef.current = { x, y }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    el.addEventListener('mousedown', onMouseDown)
    return () => el.removeEventListener('mousedown', onMouseDown)
  }, [])

  return { pos, headerRef }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// 공통 패널 내용
// onSpaceRef / onShelfRef: ShelfMode의 섹션 헤더 DOM 노드를 부모로 전달
function DimPreviewModal({ onClose, onDownload, dataUrl }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Card — 화면 전체 활용 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)',
          border: '1px solid #4a5e72',
          borderRadius: 16,
          boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          width: '97vw', height: '95vh',   // 뷰포트 전체 활용
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>치수 도면 미리보기</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >✕</button>
        </div>

        {/* Preview — objectFit:contain 으로 전체 이미지 표시, 스크롤 없음 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 10, background: 'rgba(0,0,0,0.25)' }}>
          <img
            src={dataUrl}
            alt="치수 도면"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 4,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            onClick={onDownload}
            style={{
              flex: 1, padding: '9px 0',
              background: '#f97316', color: 'white',
              border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            PNG 다운로드
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px 0',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PanelContent({ onCameraPreset, onArMode, onSpaceRef, onShelfRef, spaceOpen, setSpaceOpen, shelfOpen, setShelfOpen }) {
  const [arActive, setArActive] = useState(false)
  const [dimPreview, setDimPreview] = useState(null)   // data URL or null
  const { mode, width, height, depth, shelfCount, shelfPositions, feetType } = useShelfStore()
  const ModePanel = MODE_PANELS[mode] || ShelfMode

  const openDimPreview = useCallback(() => {
    const canvas = generateDimensionCanvas({ width, height, depth, shelfCount, shelfPositions, feetType })
    setDimPreview(canvas.toDataURL('image/png'))
  }, [width, height, depth, shelfCount, shelfPositions, feetType])

  const handleDownload = useCallback(() => {
    downloadDimensionPNG({ width, height, depth, shelfCount, shelfPositions, feetType })
  }, [width, height, depth, shelfCount, shelfPositions, feetType])

  return (
    <>
      <ModePanel onSpaceRef={onSpaceRef} onShelfRef={onShelfRef} spaceOpen={spaceOpen} setSpaceOpen={setSpaceOpen} shelfOpen={shelfOpen} setShelfOpen={setShelfOpen} />

      <BomPanel />
      <CameraPresetButtons onPreset={onCameraPreset} />

      {/* 도면 작성 + 공간 시뮬레이션 — 2열 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={openDimPreview}
          className="flex-1 py-2 bg-orange-500/80 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition-all"
        >
          📋 도면 작성
        </button>
        <button
          onClick={() => { setArActive(v => !v); onArMode?.() }}
          className={`flex-1 py-2 text-white text-xs font-medium rounded-lg transition-all ${
            arActive
              ? 'bg-orange-500 hover:bg-orange-400'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          공간 시뮬레이션
        </button>
      </div>

      {dimPreview && (
        <DimPreviewModal
          dataUrl={dimPreview}
          onClose={() => setDimPreview(null)}
          onDownload={handleDownload}
        />
      )}
    </>
  )
}

// 견출 탭 SVG 아이콘 (라인 타입)
// 설치 가상 공간 — 룸 코너 투시 (천장·좌벽·우벽·바닥이 모이는 공간감)
function IconSpace() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* 천장 */}
      <line x1="3" y1="4" x2="21" y2="4"/>
      {/* 좌측 벽 기둥 */}
      <line x1="3" y1="4" x2="3" y2="20"/>
      {/* 우측 벽 기둥 */}
      <line x1="21" y1="4" x2="21" y2="20"/>
      {/* 바닥 */}
      <line x1="3" y1="20" x2="21" y2="20"/>
      {/* 소실점 → 좌상 */}
      <line x1="3" y1="4" x2="12" y2="11"/>
      {/* 소실점 → 우상 */}
      <line x1="21" y1="4" x2="12" y2="11"/>
      {/* 소실점 → 좌하 */}
      <line x1="3" y1="20" x2="12" y2="11"/>
      {/* 소실점 → 우하 */}
      <line x1="21" y1="20" x2="12" y2="11"/>
    </svg>
  )
}
function IconPalette() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 1.1 0 2-.9 2-2 0-.53-.2-1-.53-1.36-.32-.35-.5-.82-.5-1.3 0-1.1.9-2 2-2h2.36C19.73 15.34 22 13.24 22 10.67 22 5.95 17.52 2 12 2z"/>
      <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}
function IconLayers() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}

const OPTION_TABS = [
  { id: 'adjust',  icon: <IconSpace />,   tooltip: '설치 가상 공간' },
  { id: 'palette', icon: <IconPalette />,  tooltip: '컬러를 선택합니다.' },
  { id: 'layers',  icon: <IconLayers />,   tooltip: '선반규격' },
]

// 팔레트 탭 — 포스트 색상 선택
function PaletteTabContent() {
  const { postColor, setPostColor } = useShelfStore()
  return (
    <div>
      <p className="text-xs font-semibold text-white/60 mb-3">색상 옵션</p>
      <p className="text-xs font-medium text-white/90 mb-2">포스트 색상</p>
      <div className="flex gap-3">
        {[
          { val: 'black', label: '검정', bg: '#1a1a1a' },
          { val: 'white', label: '흰색', bg: '#e8e8e8' },
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
  )
}

// 데스크탑: 드래그 가능 플로팅 패널 + 하단 드래그 리사이즈
function DesktopPanel({ onCameraPreset, onArMode }) {
  const [activeTab, setActiveTab] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [panelHeight, setPanelHeight] = useState(480)
  const panelHeightRef = useRef(panelHeight)
  panelHeightRef.current = panelHeight
  const contentRef = useRef(null)
  const innerRef = useRef(null)
  const panelRef = useRef(null)

  // ShelfMode 섹션 헤더 DOM 노드
  const [spaceEl, setSpaceEl] = useState(null)
  const [shelfEl, setShelfEl] = useState(null)

  // 섹션 열림 상태 — DesktopPanel에서 관리 (자동 접힘 인터랙션)
  const [spaceOpen, setSpaceOpen] = useState(false)
  const [shelfOpen, setShelfOpen] = useState(false)
  // ref로 최신값 유지 (스크롤 핸들러가 클로저 문제 없이 읽을 수 있도록)
  const spaceOpenRef = useRef(spaceOpen)
  const shelfOpenRef = useRef(shelfOpen)
  spaceOpenRef.current = spaceOpen
  shelfOpenRef.current = shelfOpen

  // 탭 Y 위치
  const [tabTops, setTabTops] = useState({ adjust: 60, palette: 140 })

  const { pos, headerRef } = useDraggable({ x: 16, y: 16 })

  // 섹션 헤더 위치 기반 탭 Y 재계산 + 자동 접힘
  const recomputeTabs = useCallback(() => {
    const panelEl = panelRef.current
    if (!panelEl) return
    const panelRect = panelEl.getBoundingClientRect()

    const COLLAPSE_THRESHOLD = 14  // 패널 상단에서 이 px 이하로 올라오면 자동 접힘

    let adjustTop = 60
    if (spaceEl) {
      const r = spaceEl.getBoundingClientRect()
      const computed = r.top + r.height / 2 - panelRect.top - 19
      // 스크롤로 섹션이 임계점 위로 올라오면 자동 접힘
      if (spaceOpenRef.current && computed < COLLAPSE_THRESHOLD) {
        setSpaceOpen(false)
      }
      adjustTop = Math.max(COLLAPSE_THRESHOLD, computed)
    }

    let paletteTop = adjustTop + 44
    if (shelfEl) {
      const r = shelfEl.getBoundingClientRect()
      const computed = r.top + r.height / 2 - panelRect.top - 19
      if (shelfOpenRef.current && computed < adjustTop + 44) {
        setShelfOpen(false)
      }
      paletteTop = Math.max(adjustTop + 44, computed)
    }

    setTabTops({ adjust: adjustTop, palette: paletteTop })
  }, [spaceEl, shelfEl])

  useEffect(() => { recomputeTabs() }, [recomputeTabs])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.addEventListener('scroll', recomputeTabs)
    return () => el.removeEventListener('scroll', recomputeTabs)
  }, [recomputeTabs])

  // 콘텐츠 크기 변경 시 패널 높이 자동 조절 + 탭 위치 재계산
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const fit = () => {
      const headerH = headerRef.current?.offsetHeight ?? 60
      const fitH = Math.min(window.innerHeight - 32, headerH + el.scrollHeight + 36)
      setPanelHeight(fitH)
      recomputeTabs()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    fit()
    return () => ro.disconnect()
  }, [headerRef, recomputeTabs])

  // 하단 리사이즈 핸들 드래그
  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = panelHeightRef.current
    function onMove(ev) {
      const newH = Math.max(200, Math.min(window.innerHeight - 80, startH + (ev.clientY - startY)))
      setPanelHeight(newH)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const onResizeDblClick = useCallback(() => {
    if (!innerRef.current) return
    const headerH = headerRef.current?.offsetHeight ?? 60
    const fitH = Math.min(window.innerHeight - 32, headerH + innerRef.current.scrollHeight + 36)
    setPanelHeight(fitH)
  }, [headerRef])

  // 공통 탭 버튼 스타일 생성
  const tabBtnStyle = (isActive) => ({
    position: 'absolute',
    width: 38,
    height: 38,
    background: isActive
      ? 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)'
      : 'linear-gradient(135deg, #141828 0%, #0e1220 100%)',
    border: '1px solid #4a5e72',
    borderLeft: 'none',
    borderRadius: '0 10px 10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: isActive ? '#f97316' : 'rgba(255,255,255,0.4)',
    transition: 'top 0.25s ease, color 0.2s, background 0.2s',
    outline: 'none',
    pointerEvents: 'auto',
  })

  return (
    <div
      ref={panelRef}
      className="config-panel fixed z-10 w-72 select-none flex flex-col"
      style={{ left: pos.x, top: pos.y, height: panelHeight }}
    >

      {/* 우측 견출 탭 레일 — borderLeft로 세로선, borderRadius로 코너 클리핑 */}
      <div style={{
        position: 'absolute', left: '100%', top: 0, height: '100%', width: 38,
        pointerEvents: 'none',
        borderLeft: '1px solid #4a5e72',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
      }}>
        {/* adjust 탭 — 설치 가상 공간 헤더 옆 (동적) */}
        {[
          { tab: OPTION_TABS[0], placement: { top: tabTops.adjust } },
          { tab: OPTION_TABS[1], placement: { top: tabTops.palette } },
          { tab: OPTION_TABS[2], placement: { bottom: 20 } },
        ].map(({ tab, placement }) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setTooltip({ text: tab.tooltip, x: r.right + 10, y: r.top + r.height / 2 })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ ...tabBtnStyle(isActive), left: 0, ...placement }}
            >
              {tab.icon}
            </button>
          )
        })}
      </div>

      {/* 말풍선 툴팁 */}
      {tooltip && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translateY(-50%)',
          background: 'rgba(8,12,24,0.95)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          padding: '5px 12px',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 2px 14px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
        }}>
          {tooltip.text}
          <span style={{
            position: 'absolute',
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '6px solid rgba(8,12,24,0.95)',
          }} />
        </div>,
        document.body
      )}

      {/* 헤더 — 드래그 이동 */}
      <div
        ref={headerRef}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
        style={{ padding: '16px 16px 0' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '20px', letterSpacing: '0.04em', color: 'white' }}>DEKIRI 3D</span>
        </div>
        {/* 드래그 영역 표시 실선 */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.25)', marginBottom: 12, borderRadius: 1 }} />
      </div>

      {/* 스크롤 가능한 내용 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 pb-2 panel-scroll">
        <div ref={innerRef}>
          {activeTab === 'palette' ? (
            <PaletteTabContent />
          ) : (
            <PanelContent
              onCameraPreset={onCameraPreset}
              onArMode={onArMode}
              onSpaceRef={setSpaceEl}
              onShelfRef={setShelfEl}
              spaceOpen={spaceOpen}
              setSpaceOpen={setSpaceOpen}
              shelfOpen={shelfOpen}
              setShelfOpen={setShelfOpen}
            />
          )}
        </div>
      </div>

      {/* 하단 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeMouseDown}
        onDoubleClick={onResizeDblClick}
        style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', flexShrink: 0 }}
      >
        <span style={{ display: 'flex', gap: 4, userSelect: 'none' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
          ))}
        </span>
      </div>
    </div>
  )
}

// 모바일: 하단 슬라이드업 시트
function MobilePanel({ onCameraPreset, onArMode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-2 pointer-events-none">
        <button
          className="pointer-events-auto config-panel px-6 py-2 rounded-full text-white text-sm font-bold shadow-lg"
          onClick={() => setOpen(v => !v)}
        >
          선반 구성 도구 {open ? '▼' : '▲'}
        </button>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-10 config-panel rounded-t-2xl transition-transform duration-300"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '75vh',
          overflowY: 'auto',
          paddingBottom: '60px',
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '15px', letterSpacing: '0.04em', color: 'white' }}>DEKIRI 3D</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xs">✕</button>
          </div>
          <PanelContent
            onCameraPreset={onCameraPreset}
            onArMode={onArMode}
          />
        </div>
      </div>
    </>
  )
}

export default function ConfigPanel({ onCameraPreset, onArMode }) {
  const isMobile = useIsMobile()
  return isMobile
    ? <MobilePanel onCameraPreset={onCameraPreset} onScreenshot={onScreenshot} onArMode={onArMode} />
    : <DesktopPanel onCameraPreset={onCameraPreset} onArMode={onArMode} />
}
