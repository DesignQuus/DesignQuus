import { useRef, useEffect, useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useDevStore, { ZERO } from '../../store/useDevStore.js'

const MM = 1 / 100
const AXIS_COLOR = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' }
const CAP_HALF = 10 * MM  // half-length of end cap tick marks (10mm)

export function getEffBbox(id, basePosMap, bboxRelMap, offsets) {
  const base = basePosMap[id]
  const rel = bboxRelMap[id]
  if (!base || !rel) return null
  const off = { ...ZERO, ...(offsets[id] || {}) }
  return {
    minX: base.x + rel.minX + off.dx, maxX: base.x + rel.maxX + off.dx,
    minY: base.y + rel.minY + off.dy, maxY: base.y + rel.maxY + off.dy,
    minZ: base.z + rel.minZ + off.dz, maxZ: base.z + rel.maxZ + off.dz,
  }
}

export function computeGaps(bA, bB) {
  const result = {}
  for (const [key, minK, maxK] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]) {
    const aMin = bA[minK], aMax = bA[maxK], bMin = bB[minK], bMax = bB[maxK]
    if (aMax <= bMin)      result[key] = Math.round((bMin - aMax) * 10) / 10
    else if (bMax <= aMin) result[key] = Math.round((aMin - bMax) * 10) / 10
    else result[key] = -Math.round((Math.min(aMax, bMax) - Math.max(aMin, bMin)) * 10) / 10
  }
  return result
}

// Lightweight line segment — geometry mutated imperatively to avoid GC pressure
function SegLine({ points, color }) {
  const geoRef = useRef()
  useEffect(() => {
    if (!geoRef.current) return
    const arr = new Float32Array(points.flat())
    const attr = new THREE.BufferAttribute(arr, 3)
    geoRef.current.setAttribute('position', attr)
    geoRef.current.computeBoundingSphere()
  }, [points])
  return (
    <lineSegments>
      <bufferGeometry ref={geoRef} />
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

export default function DevMeasure() {
  const selectedIds = useDevStore(s => s.selectedIds)
  const basePosMap  = useDevStore(s => s.basePosMap)
  const bboxRelMap  = useDevStore(s => s.bboxRelMap)
  const offsets     = useDevStore(s => s.offsets)

  const lines = useMemo(() => {
    if (selectedIds.length < 2) return []
    const idA = selectedIds[0]
    const idB = selectedIds[selectedIds.length - 1]
    const bA = getEffBbox(idA, basePosMap, bboxRelMap, offsets)
    const bB = getEffBbox(idB, basePosMap, bboxRelMap, offsets)
    if (!bA || !bB) return []

    const AXES = [
      { key: 'x', minK: 'minX', maxK: 'maxX', ot: [{ k: 'y', mn: 'minY', mx: 'maxY' }, { k: 'z', mn: 'minZ', mx: 'maxZ' }] },
      { key: 'y', minK: 'minY', maxK: 'maxY', ot: [{ k: 'x', mn: 'minX', mx: 'maxX' }, { k: 'z', mn: 'minZ', mx: 'maxZ' }] },
      { key: 'z', minK: 'minZ', maxK: 'maxZ', ot: [{ k: 'x', mn: 'minX', mx: 'maxX' }, { k: 'y', mn: 'minY', mx: 'maxY' }] },
    ]

    return AXES.reduce((acc, { key, minK, maxK, ot }) => {
      const aMin = bA[minK], aMax = bA[maxK]
      const bMin = bB[minK], bMax = bB[maxK]

      let edgeA, edgeB
      if      (aMax <= bMin) { edgeA = aMax; edgeB = bMin }
      else if (bMax <= aMin) { edgeA = bMax; edgeB = aMin }
      else return acc   // overlapping — no gap line

      const gapMm = Math.round((edgeB - edgeA) * 10) / 10
      if (gapMm < 0.1) return acc

      // Place line at avg centre of both bboxes along the other two axes
      const mid0 = (bA[ot[0].mn] + bA[ot[0].mx] + bB[ot[0].mn] + bB[ot[0].mx]) / 4
      const mid1 = (bA[ot[1].mn] + bA[ot[1].mx] + bB[ot[1].mn] + bB[ot[1].mx]) / 4

      const pt = (v) => {
        const c = { x: mid0 * MM, y: mid1 * MM, z: 0 }
        // Reassign: key → measured axis, ot[0].k → mid0, ot[1].k → mid1
        const out = { [key]: v * MM, [ot[0].k]: mid0 * MM, [ot[1].k]: mid1 * MM }
        return [out.x ?? c.x, out.y ?? c.y, out.z ?? c.z]
      }

      const start = pt(edgeA)
      const end   = pt(edgeB)
      const label = pt((edgeA + edgeB) / 2)

      // End caps: perpendicular to measurement axis, along ot[0].k
      const capIdx = ['x', 'y', 'z'].indexOf(ot[0].k)
      const cap = (p) => {
        const a = [...p]; a[capIdx] -= CAP_HALF
        const b = [...p]; b[capIdx] += CAP_HALF
        return [a, b]
      }

      acc.push({ key, gapMm, start, end, label, capA: cap(start), capB: cap(end), color: AXIS_COLOR[key] })
      return acc
    }, [])
  }, [selectedIds, basePosMap, bboxRelMap, offsets])

  if (!lines.length) return null

  return (
    <>
      {lines.map(({ key, gapMm, start, end, label, capA, capB, color }) => (
        <group key={key}>
          {/* Main dimension line */}
          <SegLine points={[start, end]} color={color} />
          {/* End cap ticks */}
          <SegLine points={capA} color={color} />
          <SegLine points={capB} color={color} />
          {/* Distance label */}
          <Html position={label} center style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(8,12,24,0.93)',
              border: `1px solid ${color}`,
              borderRadius: 4,
              padding: '2px 9px',
              color,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              boxShadow: `0 0 10px ${color}55`,
            }}>
              {gapMm} mm
            </div>
          </Html>
        </group>
      ))}
    </>
  )
}
