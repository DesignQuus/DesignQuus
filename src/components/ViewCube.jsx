import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// Custom ViewCube with Korean labels and 26-direction navigation
// Rendered as a small overlay cube in the bottom-right corner

const FACE_LABELS = [
  { dir: [1, 0, 0],  label: '우' },
  { dir: [-1, 0, 0], label: '좌' },
  { dir: [0, 1, 0],  label: '위' },
  { dir: [0, -1, 0], label: '아래' },
  { dir: [0, 0, 1],  label: '앞' },
  { dir: [0, 0, -1], label: '뒤' },
]

// Maps face index to face normal and up direction for camera positioning
const FACE_CAMERAS = {
  '1,0,0':  { pos: [20, 10, 0],   target: [0, 8, 0] },
  '-1,0,0': { pos: [-20, 10, 0],  target: [0, 8, 0] },
  '0,1,0':  { pos: [0, 30, 0.01], target: [0, 8, 0] },
  '0,-1,0': { pos: [0, -10, 0.01],target: [0, 8, 0] },
  '0,0,1':  { pos: [0, 10, 22],   target: [0, 8, 0] },
  '0,0,-1': { pos: [0, 10, -22],  target: [0, 8, 0] },
}

function ViewCubeMesh({ onFaceClick }) {
  const meshRef = useRef()
  const { camera } = useThree()
  const [hovered, setHovered] = useState(null)

  useFrame(() => {
    if (meshRef.current) {
      // Mirror camera rotation without position
      meshRef.current.quaternion.copy(camera.quaternion).invert()
    }
  })

  return (
    <group ref={meshRef}>
      {FACE_LABELS.map(({ dir, label }, i) => {
        const key = dir.join(',')
        const isHovered = hovered === key

        return (
          <group
            key={i}
            position={[dir[0] * 0.5, dir[1] * 0.5, dir[2] * 0.5]}
            onClick={(e) => { e.stopPropagation(); onFaceClick(dir) }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(key); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto' }}
          >
            <mesh>
              <planeGeometry args={[0.9, 0.9]} />
              <meshBasicMaterial
                color={isHovered ? '#7c3aed' : '#d1d5db'}
                transparent
                opacity={isHovered ? 0.95 : 0.85}
                side={THREE.FrontSide}
              />
            </mesh>
            <Html center style={{ pointerEvents: 'none' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: isHovered ? '#fff' : '#1f2937',
                userSelect: 'none',
                textShadow: isHovered ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
              }}>
                {label}
              </div>
            </Html>
          </group>
        )
      })}

      {/* Cube edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#555555" />
      </lineSegments>
    </group>
  )
}

export default function ViewCube() {
  const { camera, controls } = useThree()

  const handleFaceClick = useCallback((dir) => {
    const key = dir.join(',')
    const preset = FACE_CAMERAS[key]
    if (!preset) return

    camera.position.set(...preset.pos)
    camera.lookAt(...preset.target)

    if (controls) {
      controls.target.set(...preset.target)
      controls.update()
    }
  }, [camera, controls])

  // Rendered in a fixed corner via CSS positioning
  return (
    <group position={[0, 0, 0]}>
      <ViewCubeMesh onFaceClick={handleFaceClick} />
    </group>
  )
}
