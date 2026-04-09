import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'

const PRESETS = [
  { label: '정면', pos: [0, 8, 16] },
  { label: '측면', pos: [16, 8, 0] },
  { label: '위',   pos: [0, 24, 0.01] },
  { label: 'ISO',  pos: [12, 12, 12] },
]

// This component renders nothing — it exposes a setCameraPreset fn via ref
// Used by ConfigPanel which passes a callback
export function useCameraPreset() {
  const { camera, controls } = useThree()

  function goToPreset(pos) {
    const target = new THREE.Vector3(0, 8, 0)
    camera.position.set(...pos)
    camera.lookAt(target)
    if (controls) {
      controls.target.copy(target)
      controls.update()
    }
  }

  return goToPreset
}

// UI buttons rendered in DOM (outside Canvas)
export default function CameraPresetButtons({ onPreset }) {
  return (
    <div className="flex gap-1 mt-3 border-t border-white/20 pt-3">
      {PRESETS.map(({ label, pos }) => (
        <button
          key={label}
          onClick={() => onPreset(pos)}
          className="flex-1 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-all"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
