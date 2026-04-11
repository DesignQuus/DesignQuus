import { useRef, useState, useCallback } from 'react'
import ModeTab from './components/ui/ModeTab.jsx'
import ConfigPanel from './components/ui/ConfigPanel.jsx'
import ShelfScene from './components/ShelfScene.jsx'
import PhotoARMode from './components/ar/PhotoARMode.jsx'
import useShelfStore from './store/useShelfStore.js'
import DevTrigger from './components/dev/DevTrigger.jsx'
import DevPanel from './components/dev/DevPanel.jsx'
import { isDev } from './store/useDevStore.js'

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

      {/* Hidden DEV mode trigger — 5 rapid clicks in top-left corner */}
      <DevTrigger />

      {/* DEV panel — only visible with ?dev=1 */}
      {isDev && <DevPanel screenshotRef={screenshotRef} cameraRef={cameraRef} />}
    </div>
  )
}
