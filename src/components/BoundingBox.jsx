import { useMemo } from 'react'
import { Line } from '@react-three/drei'

// Dashed wireframe bounding box.
// All 11 normal edges: lineWidth=1, semi-transparent.
// Front-bottom edge (앞쪽 바닥): lineWidth=3, brighter — indicates space front face.
export default function BoundingBox({ width, height, depth }) {
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const { normalPoints, frontEdge } = useMemo(() => {
    const hx = w / 2, hy = h / 2, hz = d / 2
    return {
      // All edges EXCEPT front-bottom (11 edges × 2 points)
      normalPoints: [
        // Bottom face — back, left, right (front edge excluded)
        [-hx, -hy, -hz], [ hx, -hy, -hz],   // back-bottom
        [ hx, -hy, -hz], [ hx, -hy,  hz],   // right-bottom
        [-hx, -hy,  hz], [-hx, -hy, -hz],   // left-bottom
        // Top face (4 edges)
        [-hx,  hy, -hz], [ hx,  hy, -hz],
        [ hx,  hy, -hz], [ hx,  hy,  hz],
        [ hx,  hy,  hz], [-hx,  hy,  hz],
        [-hx,  hy,  hz], [-hx,  hy, -hz],
        // Vertical edges (4 edges)
        [-hx, -hy, -hz], [-hx,  hy, -hz],
        [ hx, -hy, -hz], [ hx,  hy, -hz],
        [ hx, -hy,  hz], [ hx,  hy,  hz],
        [-hx, -hy,  hz], [-hx,  hy,  hz],
      ],
      // Front-bottom edge only: y=-hy, z=+hz (앞쪽 바닥, 관람자 가까운 쪽)
      frontEdge: [[-hx, -hy, hz], [hx, -hy, hz]],
    }
  }, [w, h, d])

  return (
    <group position={[0, h / 2, d / 2]}>
      {/* 일반 엣지 11개 — 가는 점선 */}
      <Line
        points={normalPoints}
        segments
        color="#88aaff"
        lineWidth={1}
        dashed
        dashSize={0.08}
        gapSize={0.04}
        transparent
        opacity={0.45}
      />
      {/* 앞쪽 바닥 엣지 — 굵고 밝게 (공간 앞면 표시) */}
      <Line
        points={frontEdge}
        color="#aabbff"
        lineWidth={3}
        dashed
        dashSize={0.06}
        gapSize={0.03}
        transparent
        opacity={0.85}
      />
    </group>
  )
}
