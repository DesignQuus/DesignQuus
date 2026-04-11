import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { useShallow } from 'zustand/react/shallow'
import useShelfStore from '../../store/useShelfStore.js'
import useDevStore, { isDev, ZERO } from '../../store/useDevStore.js'

// SVG cross-section paths from Illustrator (viewBox 0 0 127.38 128)
const _OUTER = "M108.87,14.38c2.35,0,4.25,1.9,4.25,4.25h0v26.64c0,2.35-1.91,4.25-4.25,4.25h-54.51s-5.3,5.29-5.3,5.29v54.51c0,2.35-1.91,4.25-4.26,4.25h-26.64c-2.35,0-4.25-1.91-4.25-4.25h0V42.72c0-15.65,12.7-28.34,28.35-28.34h66.61Z"
const _HOLE1 = "M108.3,17.78h-50.74c-.78,0-1.42.63-1.42,1.41v24.94c0,.78.63,1.42,1.42,1.42h50.74c.78,0,1.42-.63,1.42-1.41h0s0-24.94,0-24.94c0-.78-.63-1.42-1.42-1.42"
const _HOLE2 = "M17.31,58.02v50.74c0,.78.63,1.42,1.41,1.42h24.94c.78,0,1.42-.63,1.42-1.42v-50.74c0-.78-.63-1.42-1.41-1.42h-24.94c-.78,0-1.42.63-1.42,1.42"

const CORNER_X = 113.12
const CORNER_Y = 14.38
const SVG_SPAN = 99.2
const SVG_SCALE = 0.35 / SVG_SPAN

const DEG = Math.PI / 180

function parsePath(d) {
  const loader = new SVGLoader()
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`)
  return data.paths[0] ?? null
}

function buildPostGeometry(h) {
  const outerPath = parsePath(_OUTER)
  const hole1Path = parsePath(_HOLE1)
  const hole2Path = parsePath(_HOLE2)
  if (!outerPath) return null

  const shapes = SVGLoader.createShapes(outerPath)
  if (!shapes.length) return null
  const shape = shapes[0]

  ;[hole1Path, hole2Path].forEach(p => {
    if (!p) return
    const hs = SVGLoader.createShapes(p)
    if (hs.length) shape.holes.push(hs[0])
  })

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h / SVG_SCALE,
    bevelEnabled: false,
    steps: 1,
  })
  geo.translate(-CORNER_X, -CORNER_Y, 0)
  geo.scale(-SVG_SCALE, SVG_SCALE, SVG_SCALE)
  geo.rotateX(-Math.PI / 2)
  return geo
}

const POST_COLORS = {
  black: { realistic: { color: '#1c1c1c', metalness: 0.6, roughness: 0.35 }, technical: '#606060' },
  white: { realistic: { color: '#e0e0e0', metalness: 0.5, roughness: 0.25 }, technical: '#d8d8d8' },
}

export default function AnglePost({ heightMm = 2400, positionMm = [0, 0], yOffsetMm = 0, renderMode = 'realistic', partId = null }) {
  const postColor = useShelfStore(s => s.postColor)
  const h = heightMm / 100
  const x = positionMm[0] / 100
  const z = positionMm[1] / 100
  const yOffset = yOffsetMm / 100

  const signX = x <= 0 ? 1 : -1
  const signZ = z <= 0 ? 1 : -1

  const postGeo = useMemo(() => buildPostGeometry(h), [h])
  const edgeGeo = useMemo(
    () => (postGeo && renderMode === 'technical' ? new THREE.EdgesGeometry(postGeo, 15) : null),
    [postGeo, renderMode]
  )
  const devEdgeGeo = useMemo(
    () => (isDev && partId && postGeo ? new THREE.EdgesGeometry(postGeo, 15) : null),
    [postGeo] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Use stable selector — avoids infinite re-render caused by object creation in selector
  const storedOffset = useDevStore(s => (isDev && partId) ? s.offsets[partId] : null)
  const devOff = useMemo(
    () => (storedOffset ? { ...ZERO, ...storedOffset } : ZERO),
    [storedOffset]
  )

  const isSelected = useDevStore(s => isDev && partId ? s.selectedIds.includes(partId) : false)
  const toggleSelect = useDevStore(s => s.toggleSelect)
  const registerPart = useDevStore(s => s.registerPart)
  const unregisterPart = useDevStore(s => s.unregisterPart)

  useEffect(() => {
    if (isDev && partId) {
      registerPart(partId, { x: positionMm[0], y: yOffsetMm, z: positionMm[1] })
      return () => unregisterPart(partId)
    }
  }, [partId]) // eslint-disable-line react-hooks/exhaustive-deps

  const palette = POST_COLORS[postColor] ?? POST_COLORS.black
  const mat = useMemo(() => {
    if (renderMode === 'technical') {
      return new THREE.MeshToonMaterial({ color: palette.technical, side: THREE.DoubleSide })
    }
    const { color, metalness, roughness } = palette.realistic
    return new THREE.MeshStandardMaterial({ color, metalness, roughness, side: THREE.DoubleSide })
  }, [renderMode, postColor])

  useEffect(() => {
    if (!isDev || !partId) return
    mat.transparent = isSelected
    mat.opacity = isSelected ? 0.5 : 1
    mat.needsUpdate = true
  }, [mat, isSelected])

  if (!postGeo) return null

  const handleClick = isDev && partId
    ? (e) => { e.stopPropagation(); toggleSelect(partId, e.shiftKey) }
    : undefined

  // scale=[-signX, 1, signZ] orients L arms outward from each shelf corner
  return (
    <group
      position={[x + devOff.dx / 100, yOffset + devOff.dy / 100, z + devOff.dz / 100]}
      rotation={[devOff.rx * DEG, devOff.ry * DEG, devOff.rz * DEG]}
    >
      <group scale={[-signX, 1, signZ]}>
        <mesh geometry={postGeo} material={mat} castShadow receiveShadow onClick={handleClick} />
        {isSelected && devEdgeGeo && (
          <lineSegments geometry={devEdgeGeo}>
            <lineBasicMaterial color="#f97316" />
          </lineSegments>
        )}
        {edgeGeo && !isSelected && (
          <lineSegments geometry={edgeGeo}>
            <lineBasicMaterial color="#222222" />
          </lineSegments>
        )}
      </group>
    </group>
  )
}
