import * as THREE from 'three'
import { useMemo } from 'react'

// Adjustable level foot at corner position
export default function LevelFoot({ positionMm = [0, 0], renderMode = 'realistic' }) {
  const SCALE = 1 / 100
  const x = positionMm[0] * SCALE
  const z = positionMm[1] * SCALE

  const mat = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: '#888888' })
    }
    return new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.6, roughness: 0.4 })
  }, [renderMode])

  return (
    <group position={[x, 0, z]}>
      {/* Base pad */}
      <mesh castShadow position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.02, 16]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Stem */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 12]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Nut */}
      <mesh castShadow position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  )
}
