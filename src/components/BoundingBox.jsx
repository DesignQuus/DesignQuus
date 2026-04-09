import { useMemo } from 'react'
import * as THREE from 'three'

// Dashed wireframe bounding box showing the shelf's footprint
export default function BoundingBox({ width, height, depth }) {
  // Convert mm → Three.js units (1 unit = 100mm = 10cm)
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const edges = useMemo(() => {
    const geo = new THREE.BoxGeometry(w, h, d)
    return new THREE.EdgesGeometry(geo)
  }, [w, h, d])

  return (
    <lineSegments
      geometry={edges}
      position={[0, h / 2, 0]}
    >
      <lineDashedMaterial
        color="#88aaff"
        dashSize={0.08}
        gapSize={0.04}
        opacity={0.5}
        transparent
      />
    </lineSegments>
  )
}
