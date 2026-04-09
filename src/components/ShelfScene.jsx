import { Suspense, useRef, useCallback } from 'react'
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
  const { width, height, depth, renderMode } = useShelfStore()

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

  // Expose screenshot handler
  screenshotRef.current = useCallback(() => {
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataURL
    link.download = `shelf_${width}x${height}.png`
    link.click()
  }, [gl, scene, camera, width, height])

  const bgColor = renderMode === 'technical' ? '#f0f4ff' : '#1a1a2e'

  return (
    <>
      {/* Background */}
      <color attach="background" args={[bgColor]} />

      {/* Lighting */}
      {renderMode === 'realistic' ? (
        <>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <directionalLight position={[-5, 10, -5]} intensity={0.3} />
          <Environment preset="city" />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={20} blur={2} />
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
      <BoundingBox width={width} height={height} depth={depth} />

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
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewcube
          faces={['우', '좌', '위', '아래', '앞', '뒤']}
          color="#d1d5db"
          hoverColor="#7c3aed"
          textColor="#1f2937"
          strokeColor="#555555"
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
      camera={{
        fov: 50,
        position: [12, height / 100 * 0.7, 18],
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
