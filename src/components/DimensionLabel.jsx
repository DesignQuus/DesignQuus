import { Html } from '@react-three/drei'

// Shows dimension label between two Y positions
export default function DimensionLabel({ yBottomMm, yTopMm, widthMm, depthMm }) {
  const SCALE = 1 / 100
  const yB = yBottomMm * SCALE
  const yT = yTopMm * SCALE
  const midY = (yB + yT) / 2
  const gap = yTopMm - yBottomMm

  const x = (widthMm / 100) / 2 + 0.55  // 포스트 외각(22.5mm) + 여유 32.5mm
  const z = 0

  return (
    <Html
      position={[x, midY, z]}
      center={false}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        fontSize: '11px',
        fontFamily: 'monospace',
        padding: '2px 6px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        {gap}mm
      </div>
    </Html>
  )
}
