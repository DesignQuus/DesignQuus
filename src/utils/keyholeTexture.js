import * as THREE from 'three'

// Procedurally generate a keyhole (열쇠구멍) texture using Canvas API.
// Each keyhole unit: circle at top + rectangular slot below
// Pitch: 27.5mm represented as 110px tall (1mm = 4px)

const MM_TO_PX = 4
const PITCH_PX = Math.round(27.5 * MM_TO_PX) // 110px per pitch

export function createKeyholeTexture(options = {}) {
  const {
    pitchCount = 40,       // number of keyhole slots vertically
    width = 64,            // texture width in px
    bgColor = '#c8c8c8',   // metal surface color
    holeColor = '#1a1a1a', // hole fill color
    circleR = 7,           // circle radius in px
    slotW = 9,             // slot width in px
    slotH = 18,            // slot height in px
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
    const topY = i * PITCH_PX + Math.round(PITCH_PX * 0.18)
    const circleY = topY + circleR

    // Circle
    ctx.beginPath()
    ctx.arc(cx, circleY, circleR, 0, Math.PI * 2)
    ctx.fillStyle = holeColor
    ctx.fill()

    // Slot below circle
    const slotTop = circleY + circleR - 2
    ctx.fillStyle = holeColor
    ctx.fillRect(cx - slotW / 2, slotTop, slotW, slotH)

    // Subtle shadow/highlight for depth
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.arc(cx, circleY, circleR + 1, 0, Math.PI * 2)
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
