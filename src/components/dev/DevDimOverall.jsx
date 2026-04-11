import { useEffect, useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useShelfStore from '../../store/useShelfStore.js'

// ─── Thin line segment — geometry built in useMemo so it's valid on first render ──
function SegLine({ p1, p2, color }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...p1, ...p2]), 3))
    g.computeBoundingSphere()
    return g
  }, [p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}

// ─── Dimension line: main line + end-cap ticks + center label ─────────────────
function DimLine({ p1, p2, label, color, capAxis }) {
  const CAP = 0.12   // 12mm in Three.js units
  const mid = [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2, (p1[2]+p2[2])/2]

  const cap1a = [...p1]; cap1a[capAxis] -= CAP
  const cap1b = [...p1]; cap1b[capAxis] += CAP
  const cap2a = [...p2]; cap2a[capAxis] -= CAP
  const cap2b = [...p2]; cap2b[capAxis] += CAP

  return (
    <group>
      <SegLine p1={p1}   p2={p2}   color={color} />
      <SegLine p1={cap1a} p2={cap1b} color={color} />
      <SegLine p1={cap2a} p2={cap2b} color={color} />
      <Html position={mid} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(8,12,24,0.93)',
          border: `1px solid ${color}`,
          borderRadius: 4,
          padding: '2px 10px',
          color,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          boxShadow: `0 0 10px ${color}55`,
        }}>
          {label}
        </div>
      </Html>
    </group>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DevDimOverall() {
  const { width, height, depth } = useShelfStore()

  const dims = useMemo(() => {
    const hw   = width  / 200   // half-width  (Three.js units, 1 unit = 100 mm)
    const H    = height / 100   // full height
    const D    = depth  / 100   // full depth
    const dz   = depth  / 200   // depth centre (world Z midpoint of shelf)

    const OUT_SIDE  = hw + 0.45  // right of shelf for height line
    const OUT_SIDE2 = hw + 0.75  // further right for depth line
    const OUT_BOT   = -0.38      // below shelf for width line

    return [
      // ── Width (X, red) ── horizontal, below shelf
      {
        key: 'width', label: `너비  ${width} mm`, color: '#ef4444',
        p1: [-hw, OUT_BOT, dz],
        p2: [ hw, OUT_BOT, dz],
        capAxis: 1,  // Y-direction caps
      },
      // ── Height (Y, green) ── vertical, to the right of shelf
      {
        key: 'height', label: `높이  ${height} mm`, color: '#22c55e',
        p1: [OUT_SIDE, 0, dz],
        p2: [OUT_SIDE, H, dz],
        capAxis: 0,  // X-direction caps
      },
      // ── Depth (Z, blue) ── depth direction, further right at mid-height
      {
        key: 'depth', label: `깊이  ${depth} mm`, color: '#3b82f6',
        p1: [OUT_SIDE2, H / 2, 0],
        p2: [OUT_SIDE2, H / 2, D],
        capAxis: 0,  // X-direction caps
      },
    ]
  }, [width, height, depth])

  return (
    <>
      {dims.map(d => <DimLine key={d.key} {...d} />)}
    </>
  )
}
