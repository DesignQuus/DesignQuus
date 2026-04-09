import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

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
    <div style={{ display: 'flex', gap: 4 }}>
      {PRESETS.map(({ label, pos }) => (
        <button
          key={label}
          onClick={() => onPreset(pos)}
          style={{
            flex: 1, padding: '5px 0', background: '#F3F4F6', color: '#374151',
            fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
