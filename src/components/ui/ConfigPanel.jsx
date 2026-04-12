import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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
const LAYOUT_OPTIONS = [
  { id: 'default',     label: '기본 2×2' },
  { id: 'front-focus', label: '정면 강조' },
  { id: 'iso-focus',   label: '등각 강조' },
  { id: '3views',      label: '3면도' },
]

function DimPreviewModal({ onClose, params }) {
  const [layout, setLayout] = useState('default')

  const dataUrl = useMemo(() => {
    const canvas = generateDimensionCanvas(params, layout)
    return canvas.toDataURL('image/png')
  }, [params, layout])

  const handleDownload = () => downloadDimensionPNG(params, layout)

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
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)',
          border: '1px solid #4a5e72',
          borderRadius: 16,
          boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          width: '97vw', height: '95vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>제품 칫수 작성</span>
          {/* 레이아웃 선택 탭 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {LAYOUT_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLayout(id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: layout === id ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.2)',
                  background: layout === id ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)',
                  color: layout === id ? '#f97316' : 'rgba(255,255,255,0.6)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >✕</button>
        </div>

        {/* Preview */}
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

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            onClick={handleDownload}
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

function PanelContent({ onCameraPreset, onArMode, onSpaceRef, onShelfRef, onBomRef, spaceOpen, setSpaceOpen, shelfOpen, setShelfOpen, bomOpen, onBomToggle }) {
  const [arActive, setArActive] = useState(false)
  const [dimParams, setDimParams] = useState(null)
  const { mode, shelves, shelfGap } = useShelfStore()
  const ModePanel = MODE_PANELS[mode] || ShelfMode

  const openDimPreview = useCallback(() => {
    setDimParams({ shelves, shelfGap, mode })
  }, [shelves, shelfGap, mode])

  return (
    <>
      <ModePanel onSpaceRef={onSpaceRef} onShelfRef={onShelfRef} spaceOpen={spaceOpen} setSpaceOpen={setSpaceOpen} shelfOpen={shelfOpen} setShelfOpen={setShelfOpen} />

      {/* BomPanel에 카메라/도면/AR 도구 통합 — 아코디언 제어 */}
      <BomPanel
        onCameraPreset={onCameraPreset}
        onDim={openDimPreview}
        arActive={arActive}
        setArActive={setArActive}
        onBomRef={onBomRef}
        open={bomOpen}
        onToggle={onBomToggle}
      />

      {dimParams && (
        <DimPreviewModal
          params={dimParams}
          onClose={() => setDimParams(null)}
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
function IconShelf() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="3" x2="4" y2="21"/>
      <line x1="20" y1="3" x2="20" y2="21"/>
      <line x1="4" y1="8" x2="20" y2="8"/>
      <line x1="4" y1="14" x2="20" y2="14"/>
      <line x1="4" y1="21" x2="20" y2="21"/>
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
  { id: 'adjust',  icon: <IconSpace />,  tooltip: '설치 가상\n공간' },
  { id: 'palette', icon: <IconShelf />,  tooltip: '선반 규격' },
  { id: 'layers',  icon: <IconLayers />, tooltip: '색상 옵션' },
]

// 설치 가상 공간 탭 — 렌더 모드 선택
function RenderModeTabContent() {
  const { renderMode, setRenderMode } = useShelfStore()
  return (
    <div>
      <p className="text-xs font-semibold text-white/60 mb-3">렌더 모드</p>
      <div className="flex gap-2">
        {[['realistic', '리얼'], ['technical', 'ISO']].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setRenderMode(val)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${renderMode === val
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  )
}

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
  const [panelMode, setPanelMode] = useState('normal') // 'normal' | 'compact' | 'maximized'
  const [expandAll, setExpandAll] = useState(false)
  const panelModeRef = useRef('normal')
  panelModeRef.current = panelMode
  const contentRef = useRef(null)
  const innerRef = useRef(null)
  const panelRef = useRef(null)

  // ShelfMode / BomPanel 섹션 헤더 DOM 노드
  const [spaceEl, setSpaceEl] = useState(null)
  const [shelfEl, setShelfEl] = useState(null)
  const [bomEl,   setBomEl]   = useState(null)
  // ref 미러 — goCompact에서 deps 없이 즉시 접근
  const spaceElRef = useRef(null)
  const shelfElRef = useRef(null)
  const bomElRef   = useRef(null)
  spaceElRef.current = spaceEl
  shelfElRef.current = shelfEl
  bomElRef.current   = bomEl
  // recomputeTabs 최신 참조 (goCompact/goMaximized에서 정의 순서 무관하게 접근)
  const recomputeTabsRef = useRef(null)

  // 각 섹션 헤더 우측에 맞춰 표시되는 탭 버튼 Y 위치
  const [tabTops, setTabTops] = useState([55, 99, 143])

  // 아코디언 — 한 섹션만 열림 ('space' | 'shelf' | 'bom' | null)
  // expandAll=true 이면 모든 섹션 동시 열림 (maximized 모드)
  const [activeSection, setActiveSection] = useState(null)
  const spaceOpen = expandAll || activeSection === 'space'
  const shelfOpen = expandAll || activeSection === 'shelf'
  const bomOpen   = expandAll || activeSection === 'bom'

  // 각 섹션 토글 (같은 섹션 클릭 시 접힘) — 수동 조작 시 normal 모드로 복귀
  const setSpaceOpen = (v) => { setExpandAll(false); setPanelMode('normal'); setActiveSection(v ? 'space' : null) }
  const setShelfOpen = (v) => { setExpandAll(false); setPanelMode('normal'); setActiveSection(v ? 'shelf' : null) }
  const toggleBom = () => { setExpandAll(false); setPanelMode('normal'); setActiveSection(prev => prev === 'bom' ? null : 'bom') }

  // ref로 최신값 유지 (recomputeTabs 스크롤 핸들러용)
  const spaceOpenRef = useRef(spaceOpen)
  const shelfOpenRef = useRef(shelfOpen)
  spaceOpenRef.current = spaceOpen
  shelfOpenRef.current = shelfOpen

  const { pos, headerRef } = useDraggable({ x: 16, y: 16 })

  // compact: 모든 섹션 접기 + 패널 최소 높이 즉시 설정
  // 섹션 헤더 버튼(spaceEl/shelfEl/bomEl)은 아코디언과 무관하게 즉시 측정 가능
  const goCompact = useCallback(() => {
    setExpandAll(false)
    setActiveSection(null)
    setPanelMode('compact')
    if (!headerRef.current) return
    const headerH = headerRef.current.offsetHeight
    const h0 = spaceElRef.current?.offsetHeight ?? 28
    const h1 = shelfElRef.current?.offsetHeight ?? 28
    const h2 = bomElRef.current?.offsetHeight  ?? 28
    // 섹션 간 보더/패딩/마진 ≈ 70px + 하단 리사이즈 핸들 20px
    setPanelHeight(headerH + h0 + h1 + h2 + 90)
    // 다음 프레임에서 탭 위치 즉시 재계산
    requestAnimationFrame(() => recomputeTabsRef.current?.())
  }, [headerRef])

  // maximized: 모든 섹션 열기 + 패널 최대 높이
  const goMaximized = useCallback(() => {
    setPanelMode('maximized')
    setExpandAll(true)
    setActiveSection(null)
    setPanelHeight(Math.max(300, window.innerHeight - pos.y - 16))
    requestAnimationFrame(() => recomputeTabsRef.current?.())
  }, [pos.y])

  // 단일클릭: compact ↔ maximized 즉시 토글 (e.detail≥2 → 더블클릭에 위임)
  // 더블클릭: 내용 높이에 맞게 피팅 (normal 모드)
  const handleDotsClick = useCallback((e) => {
    if (e.detail >= 2) return  // 더블클릭 이벤트가 처리
    if (panelModeRef.current === 'compact') goMaximized()
    else goCompact()
  }, [goCompact, goMaximized])

  const handleDotsDblClick = useCallback(() => {
    if (!innerRef.current || !headerRef.current) return
    const headerH = headerRef.current.offsetHeight
    // 피팅 시에는 전체 스크롤 가능 높이 기준 (열려있는 콘텐츠 포함)
    const fitH = Math.min(window.innerHeight - 32, headerH + innerRef.current.scrollHeight + 36)
    setPanelMode('normal')
    setExpandAll(false)
    setPanelHeight(fitH)
  }, [headerRef])

  // 섹션 헤더 위치 기반 탭 Y 재계산 + 자동 접힘
  const recomputeTabs = useCallback(() => {
    const panelEl = panelRef.current
    if (!panelEl) return
    const panelRect = panelEl.getBoundingClientRect()

    const COLLAPSE_THRESHOLD = 14  // 패널 상단에서 이 px 이하로 올라오면 자동 접힘
    const MIN_SPACING = 42         // 탭 버튼 간 최소 간격 px

    // 섹션 헤더 중앙 Y → 패널 좌상단 기준 탭 top 값
    function headerTop(el, fallback) {
      if (!el) return fallback
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2 - panelRect.top - 24  // -19(버튼중심) - 5(위로 5px)
    }

    let t0 = Math.max(COLLAPSE_THRESHOLD, headerTop(spaceEl, 60))
    if (spaceOpenRef.current && headerTop(spaceEl, 60) < COLLAPSE_THRESHOLD) setActiveSection(null)

    let t1 = Math.max(t0 + MIN_SPACING, headerTop(shelfEl, t0 + MIN_SPACING))
    if (shelfOpenRef.current && headerTop(shelfEl, t1) < COLLAPSE_THRESHOLD) setActiveSection(null)

    let t2 = Math.max(t1 + MIN_SPACING, headerTop(bomEl, t1 + MIN_SPACING))

    setTabTops([t0, t1, t2])
  }, [spaceEl, shelfEl, bomEl])

  // 최신 recomputeTabs 를 ref에 저장 (goCompact/goMaximized 에서 RAF로 호출)
  recomputeTabsRef.current = recomputeTabs

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
      // compact/maximized 모드에서도 탭 위치는 항상 재계산
      if (panelModeRef.current !== 'normal') {
        recomputeTabs()
        return
      }
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
    // 현재 콘텐츠가 모두 보이는 최소 높이 — 드래그 시 이 값 이하로 축소 불가
    const minH = (headerRef.current?.offsetHeight ?? 60) + (innerRef.current?.scrollHeight ?? 80) + 28 + 20
    function onMove(ev) {
      const newH = Math.max(minH, Math.min(window.innerHeight - 80, startH + (ev.clientY - startY)))
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

  // 공통 탭 버튼 스타일 (균등 배치 — position absolute 제거)
  const tabBtnStyle = (isActive) => ({
    width: 38,
    height: 38,
    padding: 0,
    boxSizing: 'border-box',
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
    transition: 'color 0.2s, background 0.2s',
    outline: 'none',
    pointerEvents: 'auto',
    flexShrink: 0,
  })

  return (
    <div
      ref={panelRef}
      className="config-panel fixed z-10 w-72 select-none flex flex-col"
      style={{ left: pos.x, top: pos.y, height: panelHeight, transition: panelMode !== 'normal' ? 'height 0.3s ease' : 'none' }}
    >

      {/* 우측 견출 탭 레일 — 섹션 헤더 위치에 정렬 */}
      <div style={{
        position: 'absolute', left: '100%', top: 0, height: '100%', width: 38,
        pointerEvents: 'none',
        borderLeft: '1px solid #4a5e72',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
      }}>
        {OPTION_TABS.map((tab, i) => {
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
              style={{ ...tabBtnStyle(isActive), position: 'absolute', top: tabTops[i] }}
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
          left: tooltip.center ? tooltip.x : tooltip.x,
          top: tooltip.center ? tooltip.y : tooltip.y,
          transform: tooltip.center ? 'translate(-50%, -100%)' : 'translateY(-50%)',
          background: 'white',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 8,
          padding: '5px 12px',
          color: '#1a1a1a',
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'pre-line',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}>
          {tooltip.text}
          {tooltip.center ? (
            /* 하단 화살표 (핸들 툴팁용) */
            <span style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid white',
            }} />
          ) : (
            /* 좌측 화살표 (탭 툴팁용) */
            <span style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '6px solid white',
            }} />
          )}
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
          {activeTab === 'adjust' ? (
            <RenderModeTabContent />
          ) : activeTab === 'palette' ? (
            <PaletteTabContent />
          ) : (
            <PanelContent
              onCameraPreset={onCameraPreset}
              onArMode={onArMode}
              onSpaceRef={setSpaceEl}
              onShelfRef={setShelfEl}
              onBomRef={setBomEl}
              spaceOpen={spaceOpen}
              setSpaceOpen={setSpaceOpen}
              shelfOpen={shelfOpen}
              setShelfOpen={setShelfOpen}
              bomOpen={bomOpen}
              onBomToggle={toggleBom}
            />
          )}
        </div>
      </div>

      {/* 하단 핸들: 단일클릭=compact↔maximized 토글, 더블클릭=높이 피팅, 드래그=리사이즈(normal/maximized) */}
      <div
        onMouseDown={panelMode !== 'compact' ? onResizeMouseDown : undefined}
        onClick={handleDotsClick}
        onDoubleClick={handleDotsDblClick}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setTooltip({ text: '조정창 확대 축소', x: r.left + r.width / 2, y: r.top - 8, center: true })
        }}
        onMouseLeave={() => setTooltip(null)}
        style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: panelMode === 'compact' ? 'pointer' : 'ns-resize', flexShrink: 0 }}
      >
        <span style={{ display: 'flex', gap: 4, userSelect: 'none' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: panelMode === 'compact' ? '#f97316' : 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
          ))}
        </span>
      </div>
    </div>
  )
}

// 모바일: 하단 슬라이드업 바텀시트 (아코디언 포함)
function MobilePanel({ onCameraPreset, onArMode }) {
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  const spaceOpen = activeSection === 'space'
  const shelfOpen = activeSection === 'shelf'
  const bomOpen   = activeSection === 'bom'
  const setSpaceOpen = (v) => setActiveSection(v ? 'space' : null)
  const setShelfOpen = (v) => setActiveSection(v ? 'shelf' : null)
  const toggleBom    = () => setActiveSection(prev => prev === 'bom' ? null : 'bom')

  // 터치 스와이프 닫기: 시트 상단을 아래로 드래그하면 닫힘
  const touchStartY = useRef(0)
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const onTouchEnd   = (e) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (dy > 60) setSheetOpen(false)
  }

  return (
    <>
      {/* FAB — 하단 중앙 고정 버튼 */}
      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none' }}>
        <button
          onClick={() => setSheetOpen(v => !v)}
          style={{
            pointerEvents: 'auto',
            background: 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)',
            border: '1px solid #4a5e72',
            borderRadius: 24,
            padding: '9px 22px',
            color: 'white',
            fontSize: 13,
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            letterSpacing: '0.04em',
            boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          DEKIRI 3D
          <span style={{ fontSize: 10, opacity: 0.7 }}>{sheetOpen ? '▼' : '▲'}</span>
        </button>
      </div>

      {/* 반투명 배경 오버레이 */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 29, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      {/* 바텀 시트 */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 30,
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)',
          border: '1px solid #4a5e72',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -6px 32px rgba(0,0,0,0.5)',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 18px 12px', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: '0.04em', color: 'white' }}>DEKIRI 3D</span>
          <button
            onClick={() => setSheetOpen(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 0, flexShrink: 0 }} />

        {/* 스크롤 가능한 내용 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px', WebkitOverflowScrolling: 'touch' }}>
          <PanelContent
            onCameraPreset={onCameraPreset}
            onArMode={onArMode}
            spaceOpen={spaceOpen}
            setSpaceOpen={setSpaceOpen}
            shelfOpen={shelfOpen}
            setShelfOpen={setShelfOpen}
            bomOpen={bomOpen}
            onBomToggle={toggleBom}
          />
        </div>
      </div>
    </>
  )
}

export default function ConfigPanel({ onCameraPreset, onArMode }) {
  const isMobile = useIsMobile()
  return isMobile
    ? <MobilePanel onCameraPreset={onCameraPreset} onArMode={onArMode} />
    : <DesktopPanel onCameraPreset={onCameraPreset} onArMode={onArMode} />
}
