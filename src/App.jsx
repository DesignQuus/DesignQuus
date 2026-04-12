import React, { useRef, useState, useCallback, useEffect } from 'react'
import ModeTab from './components/ui/ModeTab.jsx'
import ConfigPanel from './components/ui/ConfigPanel.jsx'
import ShelfScene from './components/ShelfScene.jsx'
import PhotoARMode from './components/ar/PhotoARMode.jsx'
import useShelfStore from './store/useShelfStore.js'
import DevTrigger from './components/dev/DevTrigger.jsx'
import DevPanel from './components/dev/DevPanel.jsx'
import { isDev } from './store/useDevStore.js'

// 가상 공간 재설정 토스트 알림
function SpaceNotification() {
  const notification    = useShelfStore(s => s.notification)
  const clearNotification = useShelfStore(s => s.clearNotification)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!notification) return
    setShow(true)
    const fadeTimer  = setTimeout(() => setShow(false),           3000)
    const clearTimer = setTimeout(() => clearNotification(),      3300) // fade 후 제거
    return () => { clearTimeout(fadeTimer); clearTimeout(clearTimer) }
  }, [notification?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!notification) return null

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9000,
      background: 'rgba(249,115,22,0.95)',
      color: 'white',
      padding: '12px 28px',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: '0.02em',
      boxShadow: '0 4px 24px rgba(249,115,22,0.4), 0 2px 8px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      opacity: show ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      ⚠️ {notification.message}
    </div>
  )
}

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#f00', color: '#fff', padding: 16, zIndex: 9999, fontSize: 12, fontFamily: 'monospace' }}>
          {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { arMode, setArMode } = useShelfStore()
  const cameraRef = useRef(() => {})
  const controlsRef = useRef(null)
  const screenshotRef = useRef(() => {})
  const [hintsOpen, setHintsOpen] = useState(true)

  const handleCameraPreset = useCallback((pos) => {
    cameraRef.current?.(pos)
  }, [])

  const handleScreenshot = useCallback(() => {
    screenshotRef.current?.()
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        {/* 3D Viewport */}
        <ShelfScene
          cameraRef={cameraRef}
          controlsRef={controlsRef}
          screenshotRef={screenshotRef}
        />

        {/* Mode tabs — top */}
        <ModeTab />

        {/* Config panel — right */}
        <ConfigPanel
          onCameraPreset={handleCameraPreset}
          onScreenshot={handleScreenshot}
          onArMode={() => setArMode(true)}
        />

        {/* Photo AR overlay */}
        {arMode && (
          <PhotoARMode onClose={() => setArMode(false)} />
        )}

        {/* 설치 가상공간 재설정 토스트 */}
        <SpaceNotification />

        {/* 마우스 조작 안내 */}
        <div style={{
          position: 'fixed',
          zIndex: 50,
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          // 접힘: 기즈모(margin=[120,120], size≈72px) 아래 — right 102 centers under gizmo
          // 펼침: 하단 중앙
          ...(hintsOpen
            ? { bottom: 19, left: '50%', transform: 'translateX(-50%)' }
            : { bottom: 14, right: 102 }
          ),
          transition: 'bottom 0.25s ease',
        }}>
          {/* 토글 버튼 — 4모서리 라운드 */}
          <button
            onClick={() => setHintsOpen(v => !v)}
            title={hintsOpen ? '조작 안내 접기' : '조작 안내 펼치기'}
            style={{
              background: 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)',
              border: '1px solid #4a5e72',
              borderRadius: 10,
              width: 36,
              height: 30,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              color: hintsOpen ? '#f97316' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.2s, background 0.2s',
              outline: 'none',
              flexShrink: 0,
            }}
          >
            {/* 마우스 라인 아이콘 */}
            <svg width="11" height="16" viewBox="0 0 11 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="10" height="15" rx="5" stroke="currentColor" strokeWidth="1"/>
              <line x1="5.5" y1="1" x2="5.5" y2="8" stroke="currentColor" strokeWidth="1"/>
              <line x1="1" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1"/>
              <rect x="4.5" y="3" width="2" height="4" rx="1" fill="currentColor"/>
            </svg>
          </button>

          {/* 힌트 바 — 4모서리 라운드 */}
          {hintsOpen && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1e2535 0%, #15192b 50%, #111827 100%)',
              border: '1px solid #4a5e72',
              borderRadius: 10,
              padding: '5px 0',
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              boxShadow: '0 2px 14px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {[
                '좌클릭 드래그: 회전',
                '우클릭 드래그: 이동',
                '스크롤: 줌',
                'Shift+좌클릭: 이동',
              ].map((hint, i, arr) => (
                <React.Fragment key={i}>
                  <span style={{ padding: '0 14px' }}>{hint}</span>
                  {i < arr.length - 1 && (
                    <span style={{ color: 'rgba(74,94,114,0.8)', fontSize: 14, lineHeight: 1 }}>│</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Hidden DEV mode trigger — 5 rapid clicks in top-left corner */}
        <DevTrigger />

        {/* DEV panel — only visible with ?dev=1 */}
        {isDev && (
          <ErrorBoundary>
            <DevPanel screenshotRef={screenshotRef} cameraRef={cameraRef} />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  )
}
