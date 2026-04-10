import { useState, useRef, useCallback, useEffect } from 'react'
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

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button, input, a, select')) return
    e.preventDefault()
    const startX = e.clientX - posRef.current.x
    const startY = e.clientY - posRef.current.y

    function onMove(ev) {
      const x = Math.max(0, Math.min(window.innerWidth - 288, ev.clientX - startX))
      const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - startY))
      setPos({ x, y })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return { pos, onMouseDown }
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

      <button
        onClick={onArMode}
        className="w-full mt-3 py-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-all"
      >
        📷 공간 사진으로 시뮬레이션
      </button>
    </>
  )
}

// 데스크탑: 드래그 가능 플로팅 패널 + 하단 드래그 리사이즈
function DesktopPanel({ onCameraPreset, onScreenshot, onArMode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [panelHeight, setPanelHeight] = useState(480)
  const panelHeightRef = useRef(panelHeight)
  panelHeightRef.current = panelHeight

  const { pos, onPointerDown } = useDraggable({
    x: 16,
    y: 16,
  })

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

  return (
    <div
      className="config-panel fixed z-10 w-72 select-none flex flex-col"
      style={{ left: pos.x, top: pos.y, height: collapsed ? 'auto' : panelHeight }}
    >
      {/* 헤더 — 드래그 이동 */}
      <div
        className="flex justify-between items-center mb-3 cursor-grab active:cursor-grabbing px-4 pt-4 flex-shrink-0"
        onMouseDown={onMouseDown}
      >
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '15px', letterSpacing: '0.04em', color: 'white' }}>DEKIRI 3D</span>
        <div className="flex gap-2 items-center">
          <button onClick={onScreenshot} title="스크린샷" className="text-white/70 hover:text-white text-xs">📷</button>
          <button onClick={() => setCollapsed(v => !v)} className="text-white/70 hover:text-white text-xs">
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* 스크롤 가능한 내용 */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 pb-2 panel-scroll">
          <PanelContent
            onCameraPreset={onCameraPreset}
            onScreenshot={onScreenshot}
            onArMode={onArMode}
          />
        </div>
      )}

      {/* 하단 리사이즈 핸들 */}
      {!collapsed && (
        <div
          onMouseDown={onResizeMouseDown}
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
      )}
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
