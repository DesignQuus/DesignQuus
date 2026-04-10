import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

const MM = 1 / 100
// Level foot total height = 46mm in Three.js units
const TOTAL_HEIGHT_MM = 46

useGLTF.preload('/models/level-foot.glb')

export default function LevelFoot({ positionMm = [0, 0], renderMode = 'realistic' }) {
  const x = positionMm[0] * MM
  const z = positionMm[1] * MM

  const { scene } = useGLTF('/models/level-foot.glb')

  const model = useMemo(() => {
    const clone = scene.clone(true)

    // Compute bounding box of raw GLB
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)

    // Scale so model height = 46mm in Three.js units
    const targetH = TOTAL_HEIGHT_MM * MM
    const scale = size.y > 0 ? targetH / size.y : MM
    clone.scale.setScalar(scale)

    // Recompute after scale — center X/Z, bottom at y=0
    const box2 = new THREE.Box3().setFromObject(clone)
    const center = box2.getCenter(new THREE.Vector3())
    clone.position.set(-center.x, -box2.min.y, -center.z)

    // Technical mode: override with toon materials
    if (renderMode === 'technical') {
      clone.traverse(child => {
        if (child.isMesh) {
          const col = child.material?.color?.getHexString?.() ?? 'f97316'
          child.material = new THREE.MeshToonMaterial({ color: '#' + col })
        }
      })
    }

    return clone
  }, [scene, renderMode])

  return (
    <group position={[x, 0, z]}>
      <primitive object={model} castShadow receiveShadow />
    </group>
  )
}
