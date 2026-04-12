import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useShallow } from 'zustand/shallow'
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
export default function ShelfModel({ shelfConfig, isActive = true, posX = 0, posZ = 0 }) {
  const { camera, gl, controls } = useThree()
  const store = useShelfStore(useShallow(s => ({
    width: s.width, height: s.height, depth: s.depth,
    shelfPositions: s.shelfPositions, feetType: s.feetType,
    renderMode: s.renderMode, mode: s.mode,
    selectedShelfIdx: s.selectedShelfIdx,
    setSelectedShelfIdx: s.setSelectedShelfIdx,
    setShelfPosition: s.setShelfPosition,
    setActiveShelf: s.setActiveShelf,
  })))

  // 비활성 선반은 shelfConfig 값 사용, 활성 선반은 store 값 사용
  const cfg = (!isActive && shelfConfig) ? shelfConfig : store
  const { width, height, depth, shelfPositions, feetType } = cfg
  const { renderMode, mode, selectedShelfIdx, setSelectedShelfIdx, setShelfPosition, setActiveShelf } = store

  const showSpacingDims = useDevStore(s => isDev ? s.showSpacingDims : true)
  const shelvesCount = useShelfStore(s => s.shelves.length)
  const setShelfOffset = useShelfStore(s => s.setShelfOffset)
  const shelfId = shelfConfig?.id ?? null

  // 선반 유닛 XZ 드래그 상태
  const shelfDragRef = useRef(null)  // { startX, startZ, initOffX, initOffZ }
  const [isDraggingShelf, setIsDraggingShelf] = useState(false)

  // 활성 선반 오렌지 아웃라인 geometry (다중 선반일 때만 생성)
  const outlineGeo = useMemo(
    () => isActive && shelvesCount > 1
      ? new THREE.EdgesGeometry(new THREE.BoxGeometry(width / 100 + 0.01, height / 100 + 0.01, depth / 100 + 0.01))
      : null,
    [isActive, shelvesCount, width, height, depth]
  )

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

  // 선반 유닛 XZ 드래그 시작 (바닥판 onPointerDown)
  const startShelfDrag = useCallback((e) => {
    if (!isActive) return
    e.stopPropagation()

    // e.point는 선반판 표면(y≈0.79)의 좌표.
    // onPointerMove는 y=0 평면과 교차시키므로,
    // 시작점도 같은 y=0 평면으로 통일해야 드래그 시 점프가 없음.
    const rect = gl.domElement.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera({ x: nx, y: ny }, camera)
    const hit = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(dragPlane, hit)) return   // shouldn't happen

    shelfDragRef.current = {
      startX:   hit.x,
      startZ:   hit.z,
      initOffX: shelfConfig?.offsetX ?? 0,
      initOffZ: shelfConfig?.offsetZ ?? 0,
    }
    setIsDraggingShelf(true)
    document.body.style.cursor = 'move'
    if (controls) controls.enabled = false
  }, [isActive, shelfConfig, controls, camera, gl, raycaster, dragPlane])

  useEffect(() => {
    function onPointerMove(e) {
      const rect = gl.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: nx, y: ny }, camera)

      // ── 선반 유닛 XZ 드래그 ──────────────────────────────────────────
      if (shelfDragRef.current) {
        if (raycaster.ray.intersectPlane(dragPlane, dragTarget)) {
          let dx = (dragTarget.x - shelfDragRef.current.startX) * 100  // world → mm
          let dz = (dragTarget.z - shelfDragRef.current.startZ) * 100
          if (e.ctrlKey) {
            const SNAP = 27.5
            dx = Math.round(dx / SNAP) * SNAP
            dz = Math.round(dz / SNAP) * SNAP
          }
          setShelfOffset(shelfId, shelfDragRef.current.initOffX + dx, shelfDragRef.current.initOffZ + dz)
        }
        return
      }

      // ── 선반판 Y 드래그 ──────────────────────────────────────────────
      if (dragIdxRef.current < 0) return
      if (!raycaster.ray.intersectPlane(dragPlane, dragTarget)) return

      const yMm = dragTarget.y * 100
      const pitchIdx = Math.round((yMm - BOTTOM_Y - BOARD_THICK) / PITCH_MM)
      const maxPitch = Math.floor((height - BOARD_THICK * 2 - BOTTOM_Y) / PITCH_MM) - 1
      const clampedIdx = Math.max(0, Math.min(maxPitch, pitchIdx))
      setSnapYMm(BOTTOM_Y + BOARD_THICK + clampedIdx * PITCH_MM)
      setShelfPosition(dragIdxRef.current, clampedIdx)
    }

    function onPointerUp() {
      // 선반 유닛 드래그 해제
      if (shelfDragRef.current) {
        shelfDragRef.current = null
        setIsDraggingShelf(false)
        document.body.style.cursor = 'auto'
        if (controls) controls.enabled = true
        return
      }
      // 선반판 드래그 해제
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
  }, [camera, gl, controls, height, raycaster, dragPlane, dragTarget, setShelfPosition, setShelfOffset, shelfId])

  // 뒷면(포스트 끝)을 z=0 그리드 굵은 선에 정렬
  const zOffset = (halfD + POST_EXT) / 100

  return (
    <group
      position={[posX / 100, 0, zOffset + posZ / 100]}
      onClick={!isActive ? (e) => { e.stopPropagation(); setActiveShelf(shelfConfig?.id) } : undefined}
      onPointerOver={!isActive ? () => { document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={!isActive ? () => { document.body.style.cursor = 'auto' } : undefined}
    >
      {/* Angle posts */}
      {corners.map((pos, i) => (
        <AnglePost key={i} heightMm={height - 16.5} positionMm={pos} yOffsetMm={16.5} renderMode={renderMode} partId={`AnglePost_${i}`} />
      ))}

      {/* Bottom board — 활성 선반에서 드래그하면 선반 유닛 전체 XZ 이동 */}
      <ShelfBoard
        widthMm={width} depthMm={depth} yMm={BOTTOM_Y} type="bottom" renderMode={renderMode} partId="ShelfBoard_bottom"
        onPointerDown={isActive ? startShelfDrag : undefined}
        onPointerOver={isActive ? (e) => { e.stopPropagation(); if (!shelfDragRef.current) document.body.style.cursor = 'move' } : undefined}
        onPointerOut={isActive ? () => { if (!shelfDragRef.current) document.body.style.cursor = 'auto' } : undefined}
      />

      {/* 드래그 중 바닥 하이라이트 — 이동 방향 시각화 */}
      {isDraggingShelf && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[width / 100 + 0.2, depth / 100 + 0.2]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}

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

      {/* 다중 선반: 선반 번호 라벨 + 활성 선반 오렌지 아웃라인 */}
      {shelvesCount > 1 && (
        <>
          {/* C: 선반 번호 라벨 */}
          <Html
            position={[0, height / 100 + 0.12, 0]}
            center
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: isActive ? '#f97316' : 'rgba(0,0,0,0.55)',
              color: 'white',
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              padding: '2px 8px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              fontWeight: 700,
              border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.15)',
            }}>
              {shelfConfig?.label ?? '선반'}
            </div>
          </Html>

          {/* A: 활성 선반 오렌지 아웃라인 */}
          {outlineGeo && (
            <group position={[0, height / 200, 0]}>
              <lineSegments geometry={outlineGeo}>
                <lineBasicMaterial color="#f97316" />
              </lineSegments>
            </group>
          )}
        </>
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

