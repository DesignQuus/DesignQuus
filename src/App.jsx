import { useRef, useState, useCallback } from 'react'
import ModeTab from './components/ui/ModeTab.jsx'
import ConfigPanel from './components/ui/ConfigPanel.jsx'
import ShelfScene from './components/ShelfScene.jsx'
import PhotoARMode from './components/ar/PhotoARMode.jsx'
import useShelfStore from './store/useShelfStore.js'

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
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Viewport */}
      <ShelfScene
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        screenshotRef={screenshotRef}
      />

      {/* Gizmo card backdrop — panel 톤앤매너 동일 적용 */}
      <div
        style={{
          position: 'fixed',
          right: 62,
          bottom: 62,
          width: 116,
          height: 116,
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
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
    </div>
  )
}
