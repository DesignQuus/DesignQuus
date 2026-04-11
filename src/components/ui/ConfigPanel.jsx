import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useShelfStore from '../../store/useShelfStore.js'
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
function PanelContent({ onCameraPreset, onScreenshot, onArMode }) {
  const { mode, renderMode, setRenderMode } = useShelfStore()
  const ModePanel = MODE_PANELS[mode] || ShelfMode

  return (
    <>
      {/* Render mode toggle */}
      <div className="flex gap-1 mb-3">
        {[['realistic', '리얼'], ['technical', 'ISO']].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setRenderMode(val)}
            className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all
              ${renderMode === val
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <ModePanel />
      <BomPanel />
      <CameraPresetButtons onPreset={onCameraPreset} />

      {/* 스크린샷 + 공간 시뮬레이션 — 2열 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onScreenshot}
          className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-all"
        >
          📷 스크린샷
        </button>
        <button
          onClick={onArMode}
          className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-all"
        >
          공간 시뮬레이션
        </button>
      </div>
    </>
  )
}

// 견출 탭 SVG 아이콘 (라인 타입)
function IconSliders() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
      <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
      <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
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
  { id: 'adjust',  icon: <IconSliders />,  tooltip: '배치를 조절합니다.' },
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
function DesktopPanel({ onCameraPreset, onScreenshot, onArMode }) {
  const [activeTab, setActiveTab] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [panelHeight, setPanelHeight] = useState(480)
  const panelHeightRef = useRef(panelHeight)
  panelHeightRef.current = panelHeight
  const contentRef = useRef(null)
  const innerRef = useRef(null)

  const { pos, headerRef } = useDraggable({ x: 16, y: 16 })

  // 콘텐츠 크기 변경 시 패널 높이 자동 조절
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const fit = () => {
      const headerH = headerRef.current?.offsetHeight ?? 60
      const fitH = Math.min(window.innerHeight - 32, headerH + el.scrollHeight + 36)
      setPanelHeight(fitH)
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    fit()
    return () => ro.disconnect()
  }, [headerRef])

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

  // 더블클릭 → 내용 높이에 딱 맞게 강제 조절
  const onResizeDblClick = useCallback(() => {
    if (!innerRef.current) return
    const headerH = headerRef.current?.offsetHeight ?? 60
    const fitH = Math.min(window.innerHeight - 32, headerH + innerRef.current.scrollHeight + 36)
    setPanelHeight(fitH)
  }, [headerRef])

  return (
    <div
      className="config-panel fixed z-10 w-72 select-none flex flex-col"
      style={{ left: pos.x, top: pos.y, height: panelHeight }}
    >
      {/* 우측 견출 탭 버튼 — 하단 고정 (공간 시뮬레이션 버튼 옆) */}
      <div style={{
        position: 'absolute',
        left: '100%',
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {OPTION_TABS.map((tab) => {
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
              style={{
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
                transition: 'color 0.2s, background 0.2s',
                outline: 'none',
                flexShrink: 0,
              }}
            >
              {tab.icon}
            </button>
          )
        })}
      </div>

      {/* 말풍선 툴팁 — createPortal로 body에 직접 렌더 (stacking context 우회) */}
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
        className="flex justify-between items-center mb-3 cursor-grab active:cursor-grabbing px-4 pt-4 flex-shrink-0"
      >
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '15px', letterSpacing: '0.04em', color: 'white' }}>DEKIRI 3D</span>
      </div>

      {/* 스크롤 가능한 내용 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 pb-2 panel-scroll">
        <div ref={innerRef}>
          {activeTab === 'palette' ? (
            <PaletteTabContent />
          ) : (
            <PanelContent
              onCameraPreset={onCameraPreset}
              onScreenshot={onScreenshot}
              onArMode={onArMode}
            />
          )}
        </div>
      </div>

      {/* 하단 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeMouseDown}
        onDoubleClick={onResizeDblClick}
        style={{
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ns-resize',
          flexShrink: 0,
        }}
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
function MobilePanel({ onCameraPreset, onScreenshot, onArMode }) {
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
            <div className="flex gap-2">
              <button onClick={onScreenshot} className="text-white/70 hover:text-white text-xs">📷</button>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xs">✕</button>
            </div>
          </div>
          <PanelContent
            onCameraPreset={onCameraPreset}
            onScreenshot={onScreenshot}
            onArMode={onArMode}
          />
        </div>
      </div>
    </>
  )
}

export default function ConfigPanel({ onCameraPreset, onScreenshot, onArMode }) {
  const isMobile = useIsMobile()
  return isMobile
    ? <MobilePanel onCameraPreset={onCameraPreset} onScreenshot={onScreenshot} onArMode={onArMode} />
    : <DesktopPanel onCameraPreset={onCameraPreset} onScreenshot={onScreenshot} onArMode={onArMode} />
}
