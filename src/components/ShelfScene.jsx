import { Suspense, useRef, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewcube, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import FloorGrid from './FloorGrid.jsx'
import BoundingBox from './BoundingBox.jsx'
import ShelfModel from './ShelfModel.jsx'
import useShelfStore from '../store/useShelfStore.js'

// Inner component that exposes Three.js camera APIs
function SceneInner({ cameraRef, controlsRef, screenshotRef }) {
  const { camera, gl, scene } = useThree()
  const { width, height, depth, spaceWidth, spaceHeight, spaceDepth, renderMode } = useShelfStore()

  // Expose camera preset handler
  cameraRef.current = useCallback((pos) => {
    camera.position.set(...pos)
    const target = new THREE.Vector3(0, height / 200, 0)
    camera.lookAt(target)
    if (controlsRef.current) {
      controlsRef.current.target.copy(target)
      controlsRef.current.update()
    }
  }, [camera, height])

  // ISO 모드 전환 시 카메라 앵글 자동 변경
  const prevRenderMode = useRef(renderMode)
  useEffect(() => {
    if (renderMode === prevRenderMode.current) return
    prevRenderMode.current = renderMode
    if (renderMode === 'technical') {
      // ISO 등축 앵글 (45° 수평, 35° 수직)
      const d = 20
      camera.position.set(d, d * 0.7, d)
      const target = new THREE.Vector3(0, height / 200, 0)
      camera.lookAt(target)
      if (controlsRef.current) {
        controlsRef.current.target.copy(target)
        controlsRef.current.update()
      }
    }
  }, [renderMode, camera, height])

  // Expose screenshot handler
  screenshotRef.current = useCallback(() => {
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataURL
    link.download = `shelf_${width}x${height}.png`
    link.click()
  }, [gl, scene, camera, width, height])

  const bgColor = renderMode === 'technical' ? '#f0f4ff' : '#22293a'

  return (
    <>
      {/* Background */}
      <color attach="background" args={[bgColor]} />

      {/* Lighting */}
      {renderMode === 'realistic' ? (
        <>
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={0.3}
            castShadow={false}
          />
          <directionalLight position={[-5, 10, -5]} intensity={0.1} />
          <Environment preset="city" />
          <ContactShadows
            position={[0, 0.001, 0]}
            opacity={0.12}
            scale={22}
            blur={6}
            far={22}
            resolution={512}
          />
        </>
      ) : (
        <>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} />
        </>
      )}

      {/* Floor and grid */}
      <FloorGrid />

      {/* Bounding box */}
      <BoundingBox width={spaceWidth} height={spaceHeight} depth={spaceDepth} />

      {/* Shelf model */}
      <Suspense fallback={null}>
        <ShelfModel />
      </Suspense>

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={50}
        target={[0, height / 200, 0]}
      />

      {/* ViewCube gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
        <GizmoViewcube
          faces={['우', '좌', '위', '아래', '앞', '뒤']}
          color={renderMode === 'technical' ? '#e2e8f0' : '#888888'}
          hoverColor="#7c3aed"
          textColor={renderMode === 'technical' ? '#1f2937' : '#ffffff'}
          strokeColor={renderMode === 'technical' ? '#94a3b8' : '#6366f1'}
          opacity={1}
        />
      </GizmoHelper>
    </>
  )
}

export default function ShelfScene({ cameraRef, controlsRef, screenshotRef }) {
  const { height } = useShelfStore()

  return (
    <Canvas
      shadows
      orthographic
      camera={{
        position: [12, height / 100 * 0.7, 18],
        zoom: 55,
        near: 0.1,
        far: 500,
      }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <SceneInner
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        screenshotRef={screenshotRef}
      />
    </Canvas>
  )
}
