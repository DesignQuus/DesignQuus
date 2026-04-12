import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import AnglePost from './parts/AnglePost.jsx'
import ShelfBoard from './parts/ShelfBoard.jsx'
import LevelFoot from './parts/LevelFoot.jsx'
import Caster from './parts/Caster.jsx'
import DimensionLabel from './DimensionLabel.jsx'
import useShelfStore from '../store/useShelfStore.js'
import useDevStore, { isDev } from '../store/useDevStore.js'

const PITCH_MM = 27.5
const BOARD_THICK = 10
const FOOT_HEIGHT_MM = 46                     // 수평발 총 높이
const BOTTOM_Y = FOOT_HEIGHT_MM + PITCH_MM   // 46 + 27.5 = 73.5mm

// shelfConfig: 비활성 선반 렌더 시 전달 (없으면 store 활성값 사용)
// isActive: false 이면 드래그/선택 비활성
// posX: 3D X축 오프셋 (mm)
export default function ShelfModel({ shelfConfig, isActive = true, posX = 0 }) {
  const { camera, gl, controls } = useThree()
  const store = useShelfStore(s => ({
    width: s.width, height: s.height, depth: s.depth,
    shelfPositions: s.shelfPositions, feetType: s.feetType,
    renderMode: s.renderMode, mode: s.mode,
    selectedShelfIdx: s.selectedShelfIdx,
    setSelectedShelfIdx: s.setSelectedShelfIdx,
    setShelfPosition: s.setShelfPosition,
  }))

  // 비활성 선반은 shelfConfig 값 사용, 활성 선반은 store 값 사용
  const cfg = (!isActive && shelfConfig) ? shelfConfig : store
  const { width, height, depth, shelfPositions, feetType } = cfg
  const { renderMode, mode, selectedShelfIdx, setSelectedShelfIdx, setShelfPosition } = store

  const showSpacingDims = useDevStore(s => isDev ? s.showSpacingDims : true)

  const halfW = width / 2
  const halfD = depth / 2
  // 포스트 외각(코너)을 선반판 모서리에 맞추고, 암은 선반 바깥쪽으로 35mm 뻗음
  const POST_EXT = 0
  const corners = [
    [-(halfW + POST_EXT), -(halfD + POST_EXT)],
    [ (halfW + POST_EXT), -(halfD + POST_EXT)],
    [-(halfW + POST_EXT),  (halfD + POST_EXT)],
    [ (halfW + POST_EXT),  (halfD + POST_EXT)],
  ]

  const topY = height - BOARD_THICK
  const middleYs = shelfPositions.map(idx => BOTTOM_Y + BOARD_THICK + idx * PITCH_MM)
  const allYs = [BOTTOM_Y, ...middleYs, topY].sort((a, b) => a - b)

  // Drag state
  const dragIdxRef = useRef(-1)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const dragTarget = useMemo(() => new THREE.Vector3(), [])
  const [snapYMm, setSnapYMm] = useState(null)

  const startDrag = useCallback((i, e) => {
    if (!isActive) return
    e.stopPropagation()
    dragIdxRef.current = i
    setSelectedShelfIdx(i)
    document.body.style.cursor = 'grabbing'
    if (controls) controls.enabled = false
  }, [setSelectedShelfIdx, controls])

  useEffect(() => {
    function onPointerMove(e) {
      if (dragIdxRef.current < 0) return
      const rect = gl.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: nx, y: ny }, camera)
      if (!raycaster.ray.intersectPlane(dragPlane, dragTarget)) return

      const yMm = dragTarget.y * 100
      const pitchIdx = Math.round((yMm - BOTTOM_Y - BOARD_THICK) / PITCH_MM)
      const maxPitch = Math.floor((height - BOARD_THICK * 2 - BOTTOM_Y) / PITCH_MM) - 1
      const clampedIdx = Math.max(0, Math.min(maxPitch, pitchIdx))
      setSnapYMm(BOTTOM_Y + BOARD_THICK + clampedIdx * PITCH_MM)
      setShelfPosition(dragIdxRef.current, clampedIdx)
    }

    function onPointerUp() {
      if (dragIdxRef.current >= 0) {
        dragIdxRef.current = -1
        document.body.style.cursor = 'auto'
        if (controls) controls.enabled = true
        setSnapYMm(null)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, gl, controls, height, raycaster, dragPlane, dragTarget, setShelfPosition])

  // 뒷면(포스트 끝)을 z=0 그리드 굵은 선에 정렬
  const zOffset = (halfD + POST_EXT) / 100

  return (
    <group position={[posX / 100, 0, zOffset]}>
      {/* Angle posts */}
      {corners.map((pos, i) => (
        <AnglePost key={i} heightMm={height - 16.5} positionMm={pos} yOffsetMm={16.5} renderMode={renderMode} partId={`AnglePost_${i}`} />
      ))}

      {/* Bottom board */}
      <ShelfBoard widthMm={width} depthMm={depth} yMm={BOTTOM_Y} type="bottom" renderMode={renderMode} partId="ShelfBoard_bottom" />

      {/* Top board */}
      <ShelfBoard widthMm={width} depthMm={depth} yMm={topY} type="top" renderMode={renderMode} partId="ShelfBoard_top" />

      {/* Middle shelf boards — draggable */}
      {middleYs.map((yMm, i) => (
        <ShelfBoard
          key={i}
          widthMm={width}
          depthMm={depth}
          yMm={yMm}
          type="middle"
          selected={selectedShelfIdx === i}
          renderMode={renderMode}
          partId={`ShelfBoard_${i}`}
          onClick={() => setSelectedShelfIdx(selectedShelfIdx === i ? -1 : i)}
          onPointerDown={(e) => startDrag(i, e)}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = dragIdxRef.current >= 0 ? 'grabbing' : 'grab' }}
          onPointerOut={() => { if (dragIdxRef.current < 0) document.body.style.cursor = 'auto' }}
        />
      ))}

      {/* Feet */}
      {corners.map((pos, i) => (
        feetType === 'level'
          ? <LevelFoot key={i} positionMm={pos} renderMode={renderMode} partId={`LevelFoot_${i}`} />
          : <Caster key={i} positionMm={pos} renderMode={renderMode} partId={`Caster_${i}`} />
      ))}

      {/* Snap guide — horizontal yellow plane during drag */}
      {snapYMm !== null && (
        <SnapGuide yMm={snapYMm} widthMm={width} depthMm={depth} />
      )}

      {/* Dimension labels */}
      {showSpacingDims && allYs.map((y, i) => {
        if (i === 0) return null
        return (
          <DimensionLabel
            key={i}
            yBottomMm={allYs[i - 1]}
            yTopMm={y}
            widthMm={width}
            depthMm={depth}
          />
        )
      })}

      {mode === 'dressroom' && (
        <DressroomExtras widthMm={width} depthMm={depth} heightMm={height} renderMode={renderMode} />
      )}
    </group>
  )
}

// Semi-transparent horizontal plane that shows where the shelf will snap to during drag
function SnapGuide({ yMm, widthMm, depthMm }) {
  const y = yMm / 100
  const w = widthMm / 100 + 0.3
  const d = depthMm / 100 + 0.3
  return (
    <group position={[0, y, 0]}>
      {/* Filled plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Outline edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, 0.001, d)]} />
        <lineBasicMaterial color="#facc15" />
      </lineSegments>
    </group>
  )
}

function DressroomExtras({ widthMm, depthMm, heightMm, renderMode }) {
  const { hangerHeight } = useShelfStore()
  const SCALE = 1 / 100
  const w = (widthMm - 80) * SCALE
  const y = hangerHeight * SCALE
  return (
    <mesh position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, w, 16]} />
      <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
    </mesh>
  )
}
