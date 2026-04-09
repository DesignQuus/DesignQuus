import * as THREE from 'three'
import { useMemo } from 'react'

// Caster wheel at corner position
export default function Caster({ positionMm = [0, 0], renderMode = 'realistic' }) {
  const SCALE = 1 / 100
  const x = positionMm[0] * SCALE
  const z = positionMm[1] * SCALE

  const metalMat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color: '#888888' })
    return new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.7, roughness: 0.3 })
  }, [renderMode])

  const rubberMat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color: '#222222' })
    return new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.0, roughness: 0.9 })
  }, [renderMode])

  return (
    <group position={[x, 0, z]}>
      {/* Mount bracket */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.03]} />
        <primitive object={metalMat} attach="material" />
      </mesh>
      {/* Axle */}
      <mesh castShadow position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 0.07, 8]} />
        <primitive object={metalMat} attach="material" />
      </mesh>
      {/* Wheel */}
      <mesh castShadow position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.028, 0.012, 8, 24]} />
        <primitive object={rubberMat} attach="material" />
      </mesh>
    </group>
  )
}
