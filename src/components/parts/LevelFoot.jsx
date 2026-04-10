import * as THREE from 'three'
import { useMemo } from 'react'

// Level foot profile from DXF cross-section (revolution solid)
// All values in mm, converted to Three.js units (* MM)
const MM = 1 / 100

// Orange body profile: [radius, y] from bottom (y=0) to top (y=16.5mm)
// Circular arc: center=(17, 13.11), R=13.56mm — matches DXF concave shape
// Starts steep (dr/dy≈-1.2 near base), curves gently near top, shoulder at y≈12-14mm
const BODY_PTS = [
  [12.0,  0.00],   // outer bottom edge
  [12.0,  1.00],   // outer rim top
  [10.0,  1.00],   // step inward (2mm rim)
  [10.0,  1.50],   // arc start
  [ 8.3,  2.70],   // strong concave drop
  [ 6.6,  4.40],
  [ 5.3,  6.30],
  [ 4.3,  8.50],
  [ 3.6, 10.80],
  [ 3.5, 12.40],   // shoulder minimum
  [ 3.5, 13.80],
  [ 3.6, 15.50],   // fillet step-back to stem
  [ 3.87, 16.50],  // stem bottom
].map(([r, y]) => new THREE.Vector2(r * MM, y * MM))

export default function LevelFoot({ positionMm = [0, 0], renderMode = 'realistic' }) {
  const x = positionMm[0] * MM
  const z = positionMm[1] * MM

  // Orange lower body (LatheGeometry)
  const bodyGeo = useMemo(() => new THREE.LatheGeometry(BODY_PTS, 48), [])

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

  // Rubber base pad at very bottom (r=13mm, h=2mm) — slightly wider than body
  const padGeo = useMemo(() => new THREE.CylinderGeometry(13 * MM, 13 * MM, 2 * MM, 32), [])
  const matRubber = useMemo(() => (
    new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.95, metalness: 0 })
  ), [])

  return (
    <group position={[x, 0, z]}>
      {/* Black rubber pad on floor */}
      <mesh geometry={padGeo} material={matRubber} receiveShadow
        position={[0, 1 * MM, 0]} />
      {/* Orange lower body — base + curved body */}
      <mesh geometry={bodyGeo} material={matOrange} castShadow receiveShadow />
      {/* Gray upper stem */}
      <mesh geometry={stemGeo} material={matGray} castShadow
        position={[0, stemY, 0]} />
    </group>
  )
}
