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
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(21, 25, 43, 0.78)',
          border: '1px solid rgba(74, 94, 114, 0.55)',
          borderRadius: 8,
          padding: '5px 0',
          fontSize: 11,
          color: 'rgba(255,255,255,0.65)',
          boxShadow: '0 2px 14px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          userSelect: 'none',
          zIndex: 50,
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
