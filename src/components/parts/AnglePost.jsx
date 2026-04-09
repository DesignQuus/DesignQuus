import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createKeyholeTexture } from '../../utils/keyholeTexture.js'

// L-section angle post using two BoxGeometry arms
// Each corner post correctly orients both arms toward shelf center
export default function AnglePost({ heightMm = 2400, positionMm = [0, 0], renderMode = 'realistic' }) {
  const SCALE = 1 / 100
  const h = heightMm * SCALE
  const x = positionMm[0] * SCALE
  const z = positionMm[1] * SCALE

  const FLANGE = 0.35   // 35mm flange
  const THICK  = 0.012  // 1.2mm wall thickness

  // Inward direction per corner (toward shelf center)
  const signX = x <= 0 ? 1 : -1
  const signZ = z <= 0 ? 1 : -1

  // ARM1: horizontal plate (runs in X), sits at outer Z edge
  // ARM2: depth plate (runs in Z), sits at outer X edge, Z-trimmed to avoid corner overlap
  const arm1Geo = useMemo(() => new THREE.BoxGeometry(FLANGE, h, THICK), [h])
  const arm2Geo = useMemo(() => new THREE.BoxGeometry(THICK, h, FLANGE - THICK), [h])

  const arm1Z = signZ * (-FLANGE / 2 + THICK / 2)
  const arm2X = signX * (-FLANGE / 2 + THICK / 2)
  const arm2Z = signZ * (THICK / 2)

  const keyholeTexRef = useRef(null)
  useEffect(() => {
    keyholeTexRef.current = createKeyholeTexture()
    return () => { if (keyholeTexRef.current) keyholeTexRef.current.dispose() }
  }, [])

  const mat = useMemo(() => {
    if (renderMode === 'technical') return new THREE.MeshToonMaterial({ color: '#c0c0c0', side: THREE.DoubleSide })
    return new THREE.MeshStandardMaterial({
      color: '#d0d0d0',
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide,
    })
  }, [renderMode])

  return (
    <group position={[x, 0, z]}>
      {/* ARM1: horizontal, faces front/back */}
      <mesh geometry={arm1Geo} position={[0, h / 2, arm1Z]} material={mat} castShadow receiveShadow />

      {/* ARM2: depth, faces left/right */}
      <mesh geometry={arm2Geo} position={[arm2X, h / 2, arm2Z]} material={mat} castShadow receiveShadow />

      {renderMode === 'technical' && (
        <>
          <lineSegments position={[0, h / 2, arm1Z]}>
            <edgesGeometry args={[arm1Geo]} />
            <lineBasicMaterial color="#222222" />
          </lineSegments>
          <lineSegments position={[arm2X, h / 2, arm2Z]}>
            <edgesGeometry args={[arm2Geo]} />
            <lineBasicMaterial color="#222222" />
          </lineSegments>
        </>
      )}
    </group>
  )
}
