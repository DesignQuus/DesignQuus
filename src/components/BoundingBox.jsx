import { useMemo } from 'react'
import { Line } from '@react-three/drei'

// Dashed wireframe bounding box showing the shelf's footprint.
// Uses drei <Line> (Line2 / LineMaterial) which supports actual pixel lineWidth,
// unlike lineDashedMaterial where linewidth > 1 is ignored by WebGL.
export default function BoundingBox({ width, height, depth }) {
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  // 12 box edges as flat array of [start, end] point pairs for segments mode
  const points = useMemo(() => {
    const hx = w / 2, hy = h / 2, hz = d / 2
    return [
      // Bottom face
      [-hx, -hy, -hz], [ hx, -hy, -hz],
      [ hx, -hy, -hz], [ hx, -hy,  hz],
      [ hx, -hy,  hz], [-hx, -hy,  hz],
      [-hx, -hy,  hz], [-hx, -hy, -hz],
      // Top face
      [-hx,  hy, -hz], [ hx,  hy, -hz],
      [ hx,  hy, -hz], [ hx,  hy,  hz],
      [ hx,  hy,  hz], [-hx,  hy,  hz],
      [-hx,  hy,  hz], [-hx,  hy, -hz],
      // Vertical edges
      [-hx, -hy, -hz], [-hx,  hy, -hz],
      [ hx, -hy, -hz], [ hx,  hy, -hz],
      [ hx, -hy,  hz], [ hx,  hy,  hz],
      [-hx, -hy,  hz], [-hx,  hy,  hz],
    ]
  }, [w, h, d])

  return (
    <Line
      points={points}
      segments               // treat every pair as an independent segment
      position={[0, h / 2, d / 2]}
      color="#88aaff"
      lineWidth={2}          // 2× the 1px grid section lines
      dashed
      dashSize={0.08}
      gapSize={0.04}
      transparent
      opacity={0.5}
    />
  )
}
