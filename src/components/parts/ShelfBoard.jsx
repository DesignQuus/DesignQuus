import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useDevStore, { isDev, ZERO } from '../../store/useDevStore.js'

const DEG = Math.PI / 180

export default function ShelfBoard({
  widthMm = 900,
  depthMm = 450,
  yMm = 0,
  type = 'middle',
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
  const thick = 10 * SCALE   // 10mm
  const y = yMm * SCALE

  const color = selected ? '#fbbf24' : (type === 'middle' ? '#e8e0d0' : '#ddd8c8')

  // Stable selector — avoids infinite re-render
  const storedOffset = useDevStore(s => partId ? s.offsets[partId] : null)
  const devOff = useMemo(
    () => (storedOffset ? { ...ZERO, ...storedOffset } : ZERO),
    [storedOffset]
  )

  const isDevSelected = useDevStore(s => isDev && partId ? s.selectedIds.includes(partId) : false)
  const toggleSelect = useDevStore(s => s.toggleSelect)
  const registerPart = useDevStore(s => s.registerPart)
  const unregisterPart = useDevStore(s => s.unregisterPart)

  useEffect(() => {
    if (isDev && partId) {
      registerPart(partId, { x: 0, y: yMm, z: 0 },
        { minX: -widthMm / 2, minY: 0, minZ: -depthMm / 2, maxX: widthMm / 2, maxY: 10, maxZ: depthMm / 2 })
      return () => unregisterPart(partId)
    }
  }, [partId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color })
    return new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.6 })
  }, [color, renderMode])

  useEffect(() => {
    if (!isDev || !partId) return
    mat.transparent = isDevSelected
    mat.opacity = isDevSelected ? 0.5 : 1
    mat.depthWrite = !isDevSelected
    mat.needsUpdate = true
  }, [mat, isDevSelected])

  const handleClick = isDev && partId
    ? (e) => { e.stopPropagation(); toggleSelect(partId, e.shiftKey); onClick?.() }
    : onClick

  return (
    <group
      position={[devOff.dx / 100, y + thick / 2 + devOff.dy / 100, devOff.dz / 100]}
      rotation={[devOff.rx * DEG, devOff.ry * DEG, devOff.rz * DEG]}
    >
      <mesh castShadow receiveShadow onClick={handleClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <boxGeometry args={[w, thick, d]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {isDevSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, thick, d)]} />
          <lineBasicMaterial color="#f97316" />
        </lineSegments>
      )}
      {renderMode === 'technical' && !isDevSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, thick, d)]} />
          <lineBasicMaterial color="#222222" />
        </lineSegments>
      )}
    </group>
  )
}
