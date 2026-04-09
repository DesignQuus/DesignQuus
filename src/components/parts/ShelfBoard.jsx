import { useMemo } from 'react'
import * as THREE from 'three'

// A single shelf board (top/bottom/middle)
// yMm: vertical position in mm from floor
export default function ShelfBoard({
  widthMm = 900,
  depthMm = 450,
  yMm = 0,
  type = 'middle',   // 'top' | 'bottom' | 'middle'
  selected = false,
  renderMode = 'realistic',
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

  return (
    <group position={[0, y + thick / 2, 0]}>
      <mesh
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[w, thick, d]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {renderMode === 'technical' && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, thick, d)]} />
          <lineBasicMaterial color="#222222" />
        </lineSegments>
      )}
    </group>
  )
}
