import * as THREE from 'three'
import { useMemo, useEffect } from 'react'
import useDevStore, { isDev, ZERO } from '../../store/useDevStore.js'

const DEG = Math.PI / 180

export default function Caster({ positionMm = [0, 0], renderMode = 'realistic', partId = null }) {
  const SCALE = 1 / 100
  const x = positionMm[0] * SCALE
  const z = positionMm[1] * SCALE

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
      registerPart(partId, { x: positionMm[0], y: 0, z: positionMm[1] },
        { minX: -35, minY: 0, minZ: -30, maxX: 35, maxY: 100, maxZ: 30 })
      return () => unregisterPart(partId)
    }
  }, [partId]) // eslint-disable-line react-hooks/exhaustive-deps

  const metalMat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color: '#888888' })
    return new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.7, roughness: 0.3 })
  }, [renderMode])

  const rubberMat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color: '#222222' })
    return new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.0, roughness: 0.9 })
  }, [renderMode])

  useEffect(() => {
    if (!isDev || !partId) return
    for (const m of [metalMat, rubberMat]) {
      m.transparent = isDevSelected
      m.opacity = isDevSelected ? 0.5 : 1
      m.depthWrite = !isDevSelected
      m.needsUpdate = true
    }
  }, [metalMat, rubberMat, isDevSelected])

  const handleClick = isDev && partId
    ? (e) => { e.stopPropagation(); toggleSelect(partId, e.shiftKey) }
    : undefined

  return (
    <group
      position={[x + devOff.dx / 100, devOff.dy / 100, z + devOff.dz / 100]}
      rotation={[devOff.rx * DEG, devOff.ry * DEG, devOff.rz * DEG]}
      onClick={handleClick}
    >
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.03]} />
        <primitive object={metalMat} attach="material" />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.07, 8]} />
        <primitive object={metalMat} attach="material" />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.028, 0.012, 8, 24]} />
        <primitive object={rubberMat} attach="material" />
      </mesh>
      {/* DEV: transparent click catcher — easier to select small part */}
      {isDev && partId && (
        <mesh position={[0, 0.05, 0]} onClick={handleClick}>
          <boxGeometry args={[0.1, 0.1, 0.08]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {isDevSelected && (
        <lineSegments position={[0, 0.05, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.1, 0.1, 0.07)]} />
          <lineBasicMaterial color="#f97316" />
        </lineSegments>
      )}
    </group>
  )
}
