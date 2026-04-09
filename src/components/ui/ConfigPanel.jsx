import { useState, useRef, useCallback } from 'react'
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

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('button, input, a, select')) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const startX = e.clientX - posRef.current.x
    const startY = e.clientY - posRef.current.y

    function onMove(ev) {
      const x = Math.max(0, Math.min(window.innerWidth - 288, ev.clientX - startX))
      const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - startY))
      setPos({ x, y })
    }
    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }, [])

  return { pos, onPointerDown }
}

export default function ConfigPanel({ onCameraPreset, onScreenshot, onArMode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { mode, renderMode, setRenderMode } = useShelfStore()
  const { pos, onPointerDown } = useDraggable({
    x: window.innerWidth - 300,
    y: Math.round(window.innerHeight / 2) - 200,
  })

  const ModePanel = MODE_PANELS[mode] || ShelfMode

  return (
    <div
      className="config-panel fixed z-10 w-72 p-4 select-none"
      style={{
        left: pos.x,
        top: pos.y,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
      }}
    >
      {/* Header — drag handle */}
      <div
        className="flex justify-between items-center mb-3 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
      >
        <span className="text-white font-bold text-sm">선반 구성 도구</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={onScreenshot}
            title="스크린샷"
            className="text-white/70 hover:text-white text-xs transition-all"
          >
            📷
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-white/70 hover:text-white text-xs transition-all"
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
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

          {/* Mode-specific params */}
          <ModePanel />

          {/* BOM */}
          <BomPanel />

          {/* Camera presets */}
          <CameraPresetButtons onPreset={onCameraPreset} />

          {/* AR photo mode */}
          <button
            onClick={onArMode}
            className="w-full mt-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-all"
          >
            📷 공간 사진으로 시뮬레이션
          </button>
        </>
      )}
    </div>
  )
}
