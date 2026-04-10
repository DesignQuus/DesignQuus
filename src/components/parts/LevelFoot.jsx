import * as THREE from 'three'
import { useMemo } from 'react'

// Level foot profile from DXF cross-section (revolution solid)
// All values in mm, converted to Three.js units (* MM)
const MM = 1 / 100

// Orange body profile: [radius, y] from bottom (y=0) to top (y=16.5mm)
// R7.03 concave curve + R1.60 + R0.50 fillets approximated with smooth points
const BODY_PTS = [
  [12.0,  0.00],   // outer bottom edge
  [12.0,  1.00],   // outer rim top
  [10.0,  1.00],   // step inward (2mm rim)
  [ 9.8,  1.50],   // R7.03 curve start
  [ 9.2,  3.00],
  [ 8.3,  5.00],
  [ 7.2,  7.00],
  [ 6.2,  9.00],
  [ 5.4, 11.00],
  [ 4.8, 12.50],
  [ 4.4, 13.80],   // R7.03 curve end region
  [ 4.1, 14.80],   // R1.60 fillet zone
  [ 3.97, 15.60],  // R0.50 fillet zone
  [ 3.87, 16.50],  // stem bottom
].map(([r, y]) => new THREE.Vector2(r * MM, y * MM))

export default function LevelFoot({ positionMm = [0, 0], renderMode = 'realistic' }) {
  const x = positionMm[0] * MM
  const z = positionMm[1] * MM

  // Orange lower body (LatheGeometry)
  const bodyGeo = useMemo(() => new THREE.LatheGeometry(BODY_PTS, 32), [])

  // Gray upper stem (cylinder r=3.87mm, h=29.5mm)
  const stemGeo = useMemo(
    () => new THREE.CylinderGeometry(3.87 * MM, 3.87 * MM, 29.5 * MM, 16),
    []
  )

  const matOrange = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: '#f97316' })
    }
    return new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.3, roughness: 0.5 })
  }, [renderMode])

  const matGray = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: '#888888' })
    }
    return new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.6, roughness: 0.4 })
  }, [renderMode])

  // Stem center Y: starts at 16.5mm, height 29.5mm → center at 16.5 + 14.75 = 31.25mm
  const stemY = (16.5 + 29.5 / 2) * MM

  return (
    <group position={[x, 0, z]}>
      {/* Orange lower body — base + curved body */}
      <mesh geometry={bodyGeo} material={matOrange} castShadow receiveShadow />
      {/* Gray upper stem */}
      <mesh geometry={stemGeo} material={matGray} castShadow
        position={[0, stemY, 0]} />
    </group>
  )
}
