import { Suspense, useRef, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewcube, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import FloorGrid from './FloorGrid.jsx'
import BoundingBox from './BoundingBox.jsx'
import ShelfModel from './ShelfModel.jsx'
import useShelfStore from '../store/useShelfStore.js'
import useDevStore, { isDev } from '../store/useDevStore.js'
import DevMeasure from './dev/DevMeasure.jsx'
import DevDimOverall from './dev/DevDimOverall.jsx'

// Inner component that exposes Three.js camera APIs
function SceneInner({ cameraRef, controlsRef, screenshotRef }) {
  const { camera, gl, scene } = useThree()
  const { width, height, depth, spaceWidth, spaceHeight, spaceDepth, renderMode, shelves, activeShelfId, setActiveShelf, shelfGap, groupOffsetX, groupOffsetZ } = useShelfStore()
  const showOverallDims = useDevStore(s => s.showOverallDims)

  // 선반 뒷면 z=0 정렬 기준 — 카메라 타겟 오프셋 (POST_EXT=0)
  const shelfZOffset = depth / 200

  // Expose camera preset handler
  cameraRef.current = useCallback((pos) => {
    camera.position.set(...pos)
    const target = new THREE.Vector3(0, height / 200, shelfZOffset)
    camera.lookAt(target)
    if (controlsRef.current) {
      controlsRef.current.target.copy(target)
      controlsRef.current.update()
    }
  }, [camera, height, shelfZOffset])

  // ISO 모드 전환 시 카메라 앵글 자동 변경
  const prevRenderMode = useRef(renderMode)
  useEffect(() => {
    if (renderMode === prevRenderMode.current) return
    prevRenderMode.current = renderMode
    if (renderMode === 'technical') {
      // ISO 등축 앵글 (45° 수평, 35° 수직)
      const d = 20
      camera.position.set(d, d * 0.7, d)
      const target = new THREE.Vector3(0, height / 200, shelfZOffset)
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
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={0.6}
            castShadow={false}
          />
          <directionalLight position={[-5, 10, -5]} intensity={0.2} />
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

      {/* 다중 선반 — 그룹 오프셋 적용 후 X축 나란히 배치 */}
      {(() => {
        // L형 포스트 플랜지 폭(35mm): GAP=0일 때 인접 포스트 외면이 맞닿도록 보정
        const POST_BORDER = 35
        const actualGap = shelfGap + POST_BORDER * 2
        let cur = 0
        const starts = shelves.map(s => { const x = cur; cur += s.width + actualGap; return x })
        const totalSpan = cur - actualGap
        const centerOffset = -totalSpan / 2
        return (
          <group position={[groupOffsetX / 100, 0, groupOffsetZ / 100]}>
            {shelves.map((shelf, i) => {
              const posX = centerOffset + starts[i] + shelf.width / 2
              return (
                <Suspense key={shelf.id} fallback={null}>
                  <ShelfModel
                    shelfConfig={shelf}
                    isActive={shelf.id === activeShelfId}
                    posX={posX}
                  />
                </Suspense>
              )
            })}
          </group>
        )
      })()}

      {/* DEV: edge-to-edge measurement lines */}
      {isDev && <DevMeasure />}

      {/* DEV: overall W/H/D dimension lines */}
      {isDev && showOverallDims && <DevDimOverall />}

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
        target={[0, height / 200, shelfZOffset]}
      />

      {/* ViewCube gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[120, 120]}>
        <group scale={0.9}>
          <GizmoViewcube
            faces={['우', '좌', '위', '아래', '앞', '뒤']}
            color="#ffffff"
            hoverColor="#f97316"
            textColor={renderMode === 'technical' ? '#1f2937' : '#111827'}
            strokeColor={renderMode === 'technical' ? '#94a3b8' : '#6b8299'}
            opacity={1}
            font="bold 42px Arial, sans-serif"
          />
        </group>
      </GizmoHelper>
    </>
  )
}

export default function ShelfScene({ cameraRef, controlsRef, screenshotRef }) {
  const { height } = useShelfStore()
  const clearSelection = useDevStore(s => s.clear)

  return (
    <Canvas
      shadows
      orthographic
      onPointerMissed={isDev ? clearSelection : undefined}
      camera={{
        position: [12, height / 100 * 0.7, 18],
        zoom: 55,
        near: 0.1,
        far: 500,
      }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: 0 }}
    >
      <SceneInner
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        screenshotRef={screenshotRef}
      />
    </Canvas>
  )
}
