import * as THREE from 'three'

// Procedurally generate a keyhole texture using Canvas API.
// Actual shape: large oval top + narrow slot + rounded bottom cap
// Pitch: 27.5mm represented as 110px tall (1mm = 4px)

const MM_TO_PX = 4
const PITCH_PX = Math.round(27.5 * MM_TO_PX) // 110px per pitch

export function createKeyholeTexture(options = {}) {
  const {
    pitchCount = 40,       // number of keyhole slots vertically
    width = 64,            // texture width in px
    bgColor = '#c8c8c8',   // metal surface color
    holeColor = '#1a1a1a', // hole fill color
    ovalW = 14,            // top oval width in px
    ovalH = 18,            // top oval height in px
    slotW = 7,             // slot width in px
    slotH = 22,            // slot height in px
    capW = 11,             // bottom cap width in px
    capH = 7,              // bottom cap height in px
  } = options

  const height = PITCH_PX * pitchCount
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Background: brushed metal
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // Subtle horizontal brushed lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  for (let y = 0; y < height; y += 3) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  const cx = width / 2

  for (let i = 0; i < pitchCount; i++) {
    const topY = i * PITCH_PX + Math.round(PITCH_PX * 0.12)
    const ovalCy = topY + ovalH / 2

    ctx.fillStyle = holeColor

    // 1. 상단 타원 (볼트 머리 삽입부)
    ctx.beginPath()
    ctx.ellipse(cx, ovalCy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. 좁은 슬롯 (볼트 축 걸림부)
    const slotTop = ovalCy + ovalH / 2 - 2
    ctx.fillRect(cx - slotW / 2, slotTop, slotW, slotH)

    // 3. 하단 둥근 마감 캡
    const capTop = slotTop + slotH
    const capR = capH / 2
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(cx - capW / 2, capTop, capW, capH, capR)
      ctx.fill()
    } else {
      // fallback for older browsers
      ctx.beginPath()
      ctx.arc(cx, capTop + capR, capW / 2, Math.PI, 0)
      ctx.fillRect(cx - capW / 2, capTop, capW, capR)
      ctx.fill()
    }

    // 음영 강조 (깊이감)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.ellipse(cx, ovalCy, ovalW / 2 + 1, ovalH / 2 + 1, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  return texture
}

// Update Y repeat based on post height (mm)
export function updateKeyholeRepeat(texture, heightMm) {
  const pitchMm = 27.5
  texture.repeat.set(1, heightMm / pitchMm / 40) // 40 pitches baked into texture
  texture.needsUpdate = true
}
