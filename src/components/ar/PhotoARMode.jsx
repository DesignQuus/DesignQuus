import { useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useShelfStore from '../../store/useShelfStore.js'
import ShelfModel from '../ShelfModel.jsx'
import { solvePerspective } from '../../utils/perspectiveSolver.js'

const CORNER_NAMES = ['앞왼', '앞오른', '뒤오른', '뒤왼']
const CORNER_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']

export default function PhotoARMode({ onClose }) {
  const [photoUrl, setPhotoUrl] = useState(null)
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })
  const [pins, setPins] = useState([
    { x: 30, y: 70 },   // FL (앞왼)
    { x: 70, y: 70 },   // FR (앞오른)
    { x: 75, y: 45 },   // BR (뒤오른)
    { x: 25, y: 45 },   // BL (뒤왼)
  ])
  const [solved, setSolved] = useState(false)
  const [cameraParams, setCameraParams] = useState(null)
  const [dragging, setDragging] = useState(null)
  const containerRef = useRef()
  const { width, depth } = useShelfStore()

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoUrl(url)
    setSolved(false)
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
  }

  function handlePointerDown(e, idx) {
    e.preventDefault()
    setDragging(idx)
  }

  function handlePointerMove(e) {
    if (dragging === null) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    setPins(prev => prev.map((p, i) => i === dragging ? { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) } : p))
  }

  function handlePointerUp() { setDragging(null) }

  function handleSolve() {
    const imgPts = pins.map(p => ({
      x: (p.x / 100) * imgSize.w,
      y: (p.y / 100) * imgSize.h,
    }))
    const params = solvePerspective(imgPts, imgSize.w, imgSize.h, width, depth)
    setCameraParams(params)
    setSolved(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80">
        <span className="text-white font-bold text-sm">공간 사진 시뮬레이션</span>
        <button onClick={onClose} className="text-white/70 hover:text-white text-sm">✕ 닫기</button>
      </div>

      {!photoUrl ? (
        // Upload screen
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-white/60 text-sm text-center">
            선반을 설치할 공간 사진을 업로드하세요
          </div>
          <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all">
            사진 선택
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      ) : !solved ? (
        // Pin placement screen
        <div className="flex-1 flex flex-col">
          <div className="bg-black/60 px-4 py-2 text-xs text-white/70 text-center">
            선반을 놓을 바닥 모서리 4곳을 드래그해서 조절하세요 (순서: 앞왼 → 앞오른 → 뒤오른 → 뒤왼)
          </div>
          <div
            className="flex-1 relative overflow-hidden"
            ref={containerRef}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <img src={photoUrl} alt="space" className="w-full h-full object-contain" draggable={false} />

            {/* Connection lines between pins */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {[0,1,2,3].map(i => {
                const next = (i + 1) % 4
                return (
                  <line
                    key={i}
                    x1={`${pins[i].x}%`} y1={`${pins[i].y}%`}
                    x2={`${pins[next].x}%`} y2={`${pins[next].y}%`}
                    stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="6 3"
                  />
                )
              })}
            </svg>

            {/* Draggable pins */}
            {pins.map((pin, i) => (
              <div
                key={i}
                className="corner-pin"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, background: CORNER_COLORS[i] }}
                onMouseDown={(e) => handlePointerDown(e, i)}
                onTouchStart={(e) => handlePointerDown(e, i)}
              >
                <span className="corner-pin-label">{CORNER_NAMES[i]}</span>
              </div>
            ))}
          </div>

          <div className="p-4 flex gap-3">
            <button
              onClick={() => setPhotoUrl(null)}
              className="flex-1 py-2 bg-white/10 text-white text-sm rounded-xl"
            >
              다시 선택
            </button>
            <button
              onClick={handleSolve}
              className="flex-2 flex-grow-[2] py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all"
            >
              선반 오버레이 →
            </button>
          </div>
        </div>
      ) : (
        // AR overlay screen
        <AROverlayView
          photoUrl={photoUrl}
          cameraParams={cameraParams}
          onBack={() => setSolved(false)}
          onClose={onClose}
        />
      )}
    </div>
  )
}

function AROverlayView({ photoUrl, cameraParams, onBack, onClose }) {
  const { fov, position, target } = cameraParams

  function handleScreenshot() {
    const canvas = document.querySelector('#ar-canvas canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'shelf_ar.png'
    link.click()
  }

  return (
    <div className="flex-1 relative">
      {/* Background photo */}
      <img src={photoUrl} alt="space" className="absolute inset-0 w-full h-full object-contain" />

      {/* 3D overlay canvas */}
      <div id="ar-canvas" className="absolute inset-0">
        <Canvas
          camera={{ fov, position, near: 0.1, far: 500 }}
          gl={{ alpha: true, preserveDrawingBuffer: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={0.6} />
          <ShelfModel />
          <OrbitControls target={new THREE.Vector3(...target)} enableDamping />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-3 bg-gradient-to-t from-black/60">
        <button onClick={onBack} className="flex-1 py-2 bg-white/20 text-white text-sm rounded-xl">
          ← 다시 조정
        </button>
        <button onClick={handleScreenshot} className="flex-1 py-2 bg-teal-500 text-white text-sm rounded-xl">
          📷 저장
        </button>
        <button onClick={onClose} className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-xl">
          완료
        </button>
      </div>
    </div>
  )
}
