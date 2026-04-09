import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createKeyholeTexture } from '../../utils/keyholeTexture.js'

// L-shaped angle post with keyhole texture on inner faces
// position: [x, z] corner in mm units (converted internally)
export default function AnglePost({ heightMm = 2400, positionMm = [0, 0], renderMode = 'realistic' }) {
  const SCALE = 1 / 100 // mm → Three.js units
  const h = heightMm * SCALE
  const x = positionMm[0] * SCALE
  const z = positionMm[1] * SCALE

  const FLANGE = 0.35   // 35mm flange width
  const THICK  = 0.012  // 1.2mm outer wall thickness
  const LIP    = 0.014  // 1.4mm inner return lip

  // Correct L-section cross section (DXF accurate)
  // Two arms meeting at corner, each with return lip at free end
  const postGeo = useMemo(() => {
    const shape = new THREE.Shape()

    // Clockwise from outer top-left corner:
    shape.moveTo(0, 0)
    shape.lineTo(FLANGE, 0)              // horizontal arm — top outer edge
    shape.lineTo(FLANGE, THICK + LIP)   // right end: outer wall + return lip down
    shape.lineTo(FLANGE - LIP, THICK + LIP) // right return lip inward
    shape.lineTo(FLANGE - LIP, THICK)   // right return lip top
    shape.lineTo(THICK, THICK)          // inner horizontal to inner corner
    shape.lineTo(THICK, FLANGE - LIP)   // inner vertical
    shape.lineTo(THICK + LIP, FLANGE - LIP) // bottom return lip step
    shape.lineTo(THICK + LIP, FLANGE)   // bottom return lip down
    shape.lineTo(0, FLANGE)             // vertical arm — left outer edge
    shape.closePath()

    const extrudeSettings = {
      depth: h,
      bevelEnabled: false,
    }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    // Rotate so post stands vertically
    geo.rotateX(-Math.PI / 2)
    geo.translate(-FLANGE / 2, 0, -FLANGE / 2)
    return geo
  }, [h])

  const keyholeTexRef = useRef(null)

  useEffect(() => {
    keyholeTexRef.current = createKeyholeTexture()
    return () => {
      if (keyholeTexRef.current) keyholeTexRef.current.dispose()
    }
  }, [])

  const metalMat = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: '#c0c0c0' })
    }
    return new THREE.MeshStandardMaterial({
      color: '#d0d0d0',
      metalness: 0.7,
      roughness: 0.3,
    })
  }, [renderMode])

  const keyholeMat = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: '#b8b8b8' })
    }
    const mat = new THREE.MeshStandardMaterial({
      color: '#c8c8c8',
      metalness: 0.5,
      roughness: 0.4,
    })
    if (keyholeTexRef.current) {
      mat.map = keyholeTexRef.current
    }
    return mat
  }, [renderMode])

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={postGeo} castShadow receiveShadow>
        <primitive object={metalMat} attach="material" />
      </mesh>

      {/* Edge outline for technical mode */}
      {renderMode === 'technical' && (
        <lineSegments>
          <edgesGeometry args={[postGeo]} />
          <lineBasicMaterial color="#222222" />
        </lineSegments>
      )}
    </group>
  )
}
