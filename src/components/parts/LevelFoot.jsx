import { useGLTF } from '@react-three/drei'
import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useDevStore, { isDev, ZERO } from '../../store/useDevStore.js'

const MM = 1 / 100
const DEG = Math.PI / 180
const TOTAL_HEIGHT_MM = 46

useGLTF.preload('/models/level-foot.glb')

export default function LevelFoot({ positionMm = [0, 0], renderMode = 'realistic', partId = null }) {
  const x = positionMm[0] * MM
  const z = positionMm[1] * MM

  const { scene } = useGLTF('/models/level-foot.glb')

  // Stable selector — avoids infinite re-render
  const storedOffset = useDevStore(s => (isDev && partId) ? s.offsets[partId] : null)
  const devOff = useMemo(
    () => (storedOffset ? { ...ZERO, ...storedOffset } : ZERO),
    [storedOffset]
  )

  const isDevSelected = useDevStore(s => isDev && partId ? s.selectedIds.includes(partId) : false)
  const toggleSelect = useDevStore(s => s.toggleSelect)
  const registerPart = useDevStore(s => s.registerPart)
  const unregisterPart = useDevStore(s => s.unregisterPart)

  useEffect(() => {
    if (isDev && partId) {
      registerPart(partId, { x: positionMm[0], y: 0, z: positionMm[1] })
      return () => unregisterPart(partId)
    }
  }, [partId]) // eslint-disable-line react-hooks/exhaustive-deps

  const model = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const targetH = TOTAL_HEIGHT_MM * MM
    const scale = size.y > 0 ? targetH / size.y : MM
    clone.scale.setScalar(scale)
    const box2 = new THREE.Box3().setFromObject(clone)
    const center = box2.getCenter(new THREE.Vector3())
    clone.position.set(-center.x, -box2.min.y, -center.z)
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

  useEffect(() => {
    if (!isDev || !partId) return
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.transparent = isDevSelected
        child.material.opacity = isDevSelected ? 0.5 : 1
        child.material.needsUpdate = true
      }
    })
  }, [model, isDevSelected])

  const devBBox = useMemo(() => {
    if (!isDev || !partId) return null
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = box.getCenter(new THREE.Vector3())
    return { size, center }
  }, [model]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = isDev && partId
    ? (e) => { e.stopPropagation(); toggleSelect(partId, e.shiftKey) }
    : undefined

  return (
    <group
      position={[x + devOff.dx / 100, devOff.dy / 100, z + devOff.dz / 100]}
      rotation={[devOff.rx * DEG, devOff.ry * DEG, devOff.rz * DEG]}
    >
      {/* onClick on primitive so GLB mesh clicks are captured directly */}
      <primitive object={model} castShadow receiveShadow onClick={handleClick} />

      {/* DEV: transparent bounding box — easy click target even in empty areas */}
      {isDev && partId && devBBox && (
        <mesh
          position={devBBox.center.toArray()}
          onClick={handleClick}
        >
          <boxGeometry args={[devBBox.size.x, devBBox.size.y, devBBox.size.z]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* DEV selection highlight */}
      {isDevSelected && devBBox && (
        <lineSegments position={devBBox.center.toArray()}>
          <edgesGeometry args={[new THREE.BoxGeometry(devBBox.size.x, devBBox.size.y, devBBox.size.z)]} />
          <lineBasicMaterial color="#f97316" />
        </lineSegments>
      )}
    </group>
  )
}
