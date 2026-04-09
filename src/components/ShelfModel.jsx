import { useRef, useCallback, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import AnglePost from './parts/AnglePost.jsx'
import ShelfBoard from './parts/ShelfBoard.jsx'
import LevelFoot from './parts/LevelFoot.jsx'
import Caster from './parts/Caster.jsx'
import DimensionLabel from './DimensionLabel.jsx'
import useShelfStore from '../store/useShelfStore.js'

const PITCH_MM = 27.5
const BOARD_THICK = 25
const BOTTOM_Y = 100

export default function ShelfModel() {
  const { camera, gl } = useThree()
  const {
    width, height, depth,
    shelfPositions,
    feetType, renderMode,
    selectedShelfIdx, setSelectedShelfIdx,
    setShelfPosition,
    mode,
  } = useShelfStore()

  const halfW = width / 2
  const halfD = depth / 2
  const POST_OFFSET = 20
  const corners = [
    [-halfW + POST_OFFSET, -halfD + POST_OFFSET],
    [ halfW - POST_OFFSET, -halfD + POST_OFFSET],
    [-halfW + POST_OFFSET,  halfD - POST_OFFSET],
    [ halfW - POST_OFFSET,  halfD - POST_OFFSET],
  ]

  const topY = height - BOARD_THICK
  const middleYs = shelfPositions.map(idx => BOTTOM_Y + BOARD_THICK + idx * PITCH_MM)
  const allYs = [BOTTOM_Y, ...middleYs, topY].sort((a, b) => a - b)

  // Drag state
  const dragIdxRef = useRef(-1)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const dragTarget = useMemo(() => new THREE.Vector3(), [])

  const startDrag = useCallback((i, e) => {
    e.stopPropagation()
    dragIdxRef.current = i
    setSelectedShelfIdx(i)
    document.body.style.cursor = 'grabbing'
  }, [setSelectedShelfIdx])

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
      setShelfPosition(dragIdxRef.current, Math.max(0, Math.min(maxPitch, pitchIdx)))
    }

    function onPointerUp() {
      if (dragIdxRef.current >= 0) {
        dragIdxRef.current = -1
        document.body.style.cursor = 'auto'
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, gl, height, raycaster, dragPlane, dragTarget, setShelfPosition])

  return (
    <group>
      {/* Angle posts */}
      {corners.map((pos, i) => (
        <AnglePost key={i} heightMm={height} positionMm={pos} renderMode={renderMode} />
      ))}

      {/* Bottom board */}
      <ShelfBoard widthMm={width} depthMm={depth} yMm={BOTTOM_Y} type="bottom" renderMode={renderMode} />

      {/* Top board */}
      <ShelfBoard widthMm={width} depthMm={depth} yMm={topY} type="top" renderMode={renderMode} />

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
          onClick={() => setSelectedShelfIdx(selectedShelfIdx === i ? -1 : i)}
          onPointerDown={(e) => startDrag(i, e)}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = dragIdxRef.current >= 0 ? 'grabbing' : 'grab' }}
          onPointerOut={() => { if (dragIdxRef.current < 0) document.body.style.cursor = 'auto' }}
        />
      ))}

      {/* Feet */}
      {corners.map((pos, i) => (
        feetType === 'level'
          ? <LevelFoot key={i} positionMm={pos} renderMode={renderMode} />
          : <Caster key={i} positionMm={pos} renderMode={renderMode} />
      ))}

      {/* Dimension labels */}
      {allYs.map((y, i) => {
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
