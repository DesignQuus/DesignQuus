import { useRef, useCallback } from 'react'
import Sidebar from './components/ui/Sidebar.jsx'
import ConfigPanel from './components/ui/ConfigPanel.jsx'
import BottomBar from './components/ui/BottomBar.jsx'
import ShelfScene from './components/ShelfScene.jsx'
import PhotoARMode from './components/ar/PhotoARMode.jsx'
import useShelfStore from './store/useShelfStore.js'

export default function App() {
  const { arMode, setArMode, renderMode, setRenderMode } = useShelfStore()
  const cameraRef = useRef(() => {})
  const controlsRef = useRef(null)
  const screenshotRef = useRef(() => {})

  const handleCameraPreset = useCallback((pos) => { cameraRef.current?.(pos) }, [])
  const handleScreenshot   = useCallback(() => { screenshotRef.current?.() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 56px 아이콘 사이드바 */}
        <Sidebar onScreenshot={handleScreenshot} />

        {/* 300px 설정 패널 */}
        <ConfigPanel
          onCameraPreset={handleCameraPreset}
          onScreenshot={handleScreenshot}
          onArMode={() => setArMode(true)}
        />

        {/* 3D 뷰어 */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ShelfScene cameraRef={cameraRef} controlsRef={controlsRef} screenshotRef={screenshotRef} />

          {/* Sketch / Real 토글 */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 4 }}>
            {[['realistic', '👁 Real'], ['technical', '✏ Sketch']].map(([val, lbl]) => (
              <button key={val} onClick={() => setRenderMode(val)} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: '1px solid',
                borderColor: renderMode === val ? '#F97316' : '#D1D5DB',
                background:  renderMode === val ? '#FFF7ED' : '#FFFFFF',
                color:       renderMode === val ? '#F97316' : '#6B7280',
                fontWeight:  renderMode === val ? 600 : 400,
              }}>{lbl}</button>
            ))}
          </div>
        </div>
      </div>

      <BottomBar />
      {arMode && <PhotoARMode onClose={() => setArMode(false)} />}
    </div>
  )
}
