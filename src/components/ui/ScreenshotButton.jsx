import { useThree } from '@react-three/fiber'
import useShelfStore from '../../store/useShelfStore.js'

// Renders nothing in 3D — use the hook to get the screenshot fn
export function useScreenshot() {
  const { gl, scene, camera } = useThree()
  const { width, height: heightMm } = useShelfStore()

  return function takeScreenshot() {
    gl.render(scene, camera)
    const dataURL = gl.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataURL
    link.download = `shelf_${width}x${heightMm}.png`
    link.click()
  }
}
