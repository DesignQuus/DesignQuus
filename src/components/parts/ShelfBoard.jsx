import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useDevStore, { isDev, ZERO } from '../../store/useDevStore.js'

const DEG = Math.PI / 180

// A single shelf board (top/bottom/middle)
// yMm: vertical position in mm from floor
export default function ShelfBoard({
  widthMm = 900,
  depthMm = 450,
  yMm = 0,
  type = 'middle',   // 'top' | 'bottom' | 'middle'
  selected = false,
  renderMode = 'realistic',
  partId = null,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const SCALE = 1 / 100
  const w = widthMm * SCALE
  const d = depthMm * SCALE
  const thick = 0.025 // 25mm thickness
  const y = yMm * SCALE

  const color = selected ? '#fbbf24' : (type === 'middle' ? '#e8e0d0' : '#ddd8c8')

  // DEV store
  const devOff = useDevStore(s =>
    isDev && partId ? { ...ZERO, ...(s.offsets[partId] || {}) } : ZERO
  )
  const selectedId = useDevStore(s => s.selectedId)
  const select = useDevStore(s => s.select)
  const registerPart = useDevStore(s => s.registerPart)
  const unregisterPart = useDevStore(s => s.unregisterPart)
  const isDevSelected = isDev && partId && selectedId === partId

  useEffect(() => {
    if (isDev && partId) {
      registerPart(partId)
      return () => unregisterPart(partId)
    }
  }, [partId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mat = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color })
    }
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.0,
      roughness: 0.6,
    })
  }, [color, renderMode])

  const handleClick = isDev && partId
    ? (e) => { e.stopPropagation(); select(partId); onClick?.() }
    : onClick

  return (
    <group
      position={[devOff.dx / 100, y + thick / 2 + devOff.dy / 100, devOff.dz / 100]}
      rotation={[devOff.rx * DEG, devOff.ry * DEG, devOff.rz * DEG]}
    >
      <mesh
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[w, thick, d]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* DEV selection highlight */}
      {isDevSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, thick, d)]} />
          <lineBasicMaterial color="#f97316" />
        </lineSegments>
      )}

      {/* Technical mode edges (when not dev-selected) */}
      {renderMode === 'technical' && !isDevSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, thick, d)]} />
          <lineBasicMaterial color="#222222" />
        </lineSegments>
      )}
    </group>
  )
}
