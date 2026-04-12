// AlignGuide — 정렬 버튼 클릭 시 0.7초간 기준선을 3D 씬에 표시
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import useShelfStore from '../store/useShelfStore.js'

function makeLine(points, color) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return { geo, color }
}

export default function AlignGuide() {
  const alignFlash   = useShelfStore(s => s.alignFlash)
  const spaceWidth   = useShelfStore(s => s.spaceWidth)
  const spaceHeight  = useShelfStore(s => s.spaceHeight)
  const spaceDepth   = useShelfStore(s => s.spaceDepth)
  const shelves      = useShelfStore(s => s.shelves)
  const shelfGap     = useShelfStore(s => s.shelfGap)

  const [visible, setVisible] = useState(false)
  const [flash,   setFlash]   = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!alignFlash) return
    clearTimeout(timerRef.current)
    setFlash(alignFlash)
    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), 700)
    return () => clearTimeout(timerRef.current)
  }, [alignFlash?.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => {
    if (!flash || !visible) return []
    const { axis, worldPos } = flash
    const maxHeight = Math.max(...shelves.map(s => s.height), 1)
    const H  = maxHeight / 100
    const hw = spaceWidth / 200
    const sd = spaceDepth / 100
    const COLOR = '#22c55e'
    if (axis === 'x') {
      const x = worldPos
      const zMid = sd / 2
      return [
        makeLine([new THREE.Vector3(x, 0, zMid - hw * 0.08), new THREE.Vector3(x, H, zMid - hw * 0.08)], COLOR),
        makeLine([new THREE.Vector3(x - 0.06, H, zMid), new THREE.Vector3(x + 0.06, H, zMid)], COLOR),
        makeLine([new THREE.Vector3(x - 0.06, 0, zMid), new THREE.Vector3(x + 0.06, 0, zMid)], COLOR),
      ]
    } else {
      const z = worldPos
      return [
        makeLine([new THREE.Vector3(-hw, 0.01, z), new THREE.Vector3(hw, 0.01, z)], COLOR),
        makeLine([new THREE.Vector3(-hw, 0, z), new THREE.Vector3(-hw, 0.12, z)], COLOR),
        makeLine([new THREE.Vector3(hw, 0, z), new THREE.Vector3(hw, 0.12, z)], COLOR),
      ]
    }
  }, [flash, visible, shelves, shelfGap, spaceWidth, spaceDepth])

  if (!visible || lines.length === 0) return null

  return (
    <group>
      {lines.map(({ geo, color }, i) => (
        <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial color={color} linewidth={2} depthTest={false} />
        </lineSegments>
      ))}
    </group>
  )
}
