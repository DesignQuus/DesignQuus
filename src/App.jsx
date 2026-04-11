import React, { useRef, useState, useCallback } from 'react'
import ModeTab from './components/ui/ModeTab.jsx'
import ConfigPanel from './components/ui/ConfigPanel.jsx'
import ShelfScene from './components/ShelfScene.jsx'
import PhotoARMode from './components/ar/PhotoARMode.jsx'
import useShelfStore from './store/useShelfStore.js'
import DevTrigger from './components/dev/DevTrigger.jsx'
import DevPanel from './components/dev/DevPanel.jsx'
import { isDev } from './store/useDevStore.js'

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

        {/* 마우스 조작 안내 — 하단 중앙 */}
        <div style={{
          position: 'fixed',
          bottom: 19,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
          userSelect: 'none',
        }}>
          {/* 토글 탭 버튼 — ConfigPanel 탭 레일의 좌우 대칭 */}
          <div style={{
            position: 'relative',
            borderRight: '1px solid #4a5e72',
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
            pointerEvents: 'auto',
          }}>
            <button
              onClick={() => setHintsOpen(v => !v)}
              title={hintsOpen ? '조작 안내 접기' : '조작 안내 펼치기'}
              style={{
                background: hintsOpen
                  ? 'linear-gradient(135deg, #1e2535 0%, #15192b 100%)'
                  : 'linear-gradient(135deg, #141828 0%, #0e1220 100%)',
                border: '1px solid #4a5e72',
                borderRight: 'none',
                borderRadius: '10px 0 0 10px',
                width: 36,
                height: '100%',
                minHeight: 30,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                color: hintsOpen ? '#f97316' : 'rgba(255,255,255,0.4)',
                transition: 'color 0.2s, background 0.2s',
                outline: 'none',
              }}
            >
              {/* 키보드 라인 아이콘 */}
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="15" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                <rect x="2" y="2" width="2" height="2" rx="0.4" fill="currentColor"/>
                <rect x="5" y="2" width="2" height="2" rx="0.4" fill="currentColor"/>
                <rect x="8" y="2" width="2" height="2" rx="0.4" fill="currentColor"/>
                <rect x="11" y="2" width="3" height="2" rx="0.4" fill="currentColor"/>
                <rect x="2" y="6" width="12" height="2" rx="0.4" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* 힌트 바 */}
          {hintsOpen && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1e2535 0%, #15192b 50%, #111827 100%)',
              border: '1px solid #4a5e72',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
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
