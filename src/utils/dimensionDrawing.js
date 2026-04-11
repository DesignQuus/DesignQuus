// dimensionDrawing.js — A3 Landscape CAD-style technical drawing
// Canvas: 2480 × 1754 px (A3 @ 150 DPI)

const CW = 2480
const CH = 1754
const M = 55       // page margin px
const TB_H = 210   // title block height px

// Shelf geometry (must match ShelfModel.jsx / ShelfBoard.jsx)
const PITCH_MM = 27.5
const BOARD_T = 10
const POST_F = 35
const FOOT_H_MM = 46
const BOTTOM_Y_MM = FOOT_H_MM + PITCH_MM   // 73.5 mm

// ─── helpers ─────────────────────────────────────────────────────

function arrowHead(ctx, x, y, angle, size = 9) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.38)
  ctx.lineTo(-size, size * 0.38)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Horizontal dimension line.
 * x1, x2 : endpoints (canvas px)
 * refY    : feature y (canvas px)
 * offset  : perpendicular distance — negative = above, positive = below
 * label   : dimension text (without unit; caller adds 'mm')
 */
function dimH(ctx, x1, x2, refY, offset, label, fs = 20) {
  const lineY = refY + offset
  const sign = offset < 0 ? -1 : 1
  ctx.save()
  ctx.strokeStyle = '#2a2a2a'
  ctx.fillStyle = '#2a2a2a'
  ctx.lineWidth = 1.0

  // Extension lines
  for (const ex of [x1, x2]) {
    ctx.beginPath()
    ctx.moveTo(ex, refY + sign * 4)
    ctx.lineTo(ex, lineY - sign * 10)
    ctx.stroke()
  }
  // Dimension line
  ctx.beginPath()
  ctx.moveTo(x1, lineY)
  ctx.lineTo(x2, lineY)
  ctx.stroke()

  arrowHead(ctx, x1, lineY, Math.PI, 8)
  arrowHead(ctx, x2, lineY, 0, 8)

  // Label with white knockout
  ctx.font = `${fs}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const mid = (x1 + x2) / 2
  const tw = ctx.measureText(label).width + 14
  ctx.fillStyle = '#fff'
  ctx.fillRect(mid - tw / 2, lineY - fs * 0.75, tw, fs * 1.5)
  ctx.fillStyle = '#2a2a2a'
  ctx.fillText(label, mid, lineY)
  ctx.restore()
}

/**
 * Vertical dimension line.
 * y1 < y2 (top, bottom in canvas px)
 * refX   : feature x
 * offset : negative = left, positive = right
 */
function dimV(ctx, y1, y2, refX, offset, label, fs = 20) {
  const lineX = refX + offset
  const sign = offset < 0 ? -1 : 1
  ctx.save()
  ctx.strokeStyle = '#2a2a2a'
  ctx.fillStyle = '#2a2a2a'
  ctx.lineWidth = 1.0

  for (const ey of [y1, y2]) {
    ctx.beginPath()
    ctx.moveTo(refX + sign * 4, ey)
    ctx.lineTo(lineX - sign * 10, ey)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(lineX, y1)
  ctx.lineTo(lineX, y2)
  ctx.stroke()

  arrowHead(ctx, lineX, y1, -Math.PI / 2, 8)
  arrowHead(ctx, lineX, y2, Math.PI / 2, 8)

  // Rotated label
  const midY = (y1 + y2) / 2
  ctx.font = `${fs}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(label).width + 14
  ctx.save()
  ctx.translate(lineX, midY)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#fff'
  ctx.fillRect(-tw / 2, -fs * 0.75, tw, fs * 1.5)
  ctx.fillStyle = '#2a2a2a'
  ctx.fillText(label, 0, 0)
  ctx.restore()
  ctx.restore()
}

function viewLabel(ctx, text, cx, y) {
  ctx.save()
  ctx.font = 'bold 22px Arial, sans-serif'
  ctx.fillStyle = '#444'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(text, cx, y)
  ctx.restore()
}

function getYs(params) {
  const { height, shelfPositions } = params
  const topY = height - BOARD_T
  const midYs = (shelfPositions || []).map(idx => BOTTOM_Y_MM + BOARD_T + idx * PITCH_MM)
  return { topY, midYs, allYs: [BOTTOM_Y_MM, ...midYs, topY].sort((a, b) => a - b) }
}

// ─── views ───────────────────────────────────────────────────────

function drawFrontElevation(ctx, params, bx, by, bw, bh) {
  const { width, height } = params
  const { topY, midYs, allYs } = getYs(params)

  const DIM_L = 80   // left: height dim
  const DIM_T = 60   // top: width dim
  const DIM_R = 110  // right: shelf-gap dims (wider)
  const DIM_B = 40   // bottom: label
  const availW = bw - DIM_L - DIM_R
  const availH = bh - DIM_T - DIM_B - 30
  const sc = Math.min(availW / width, availH / height)
  const sw = width * sc
  const sh = height * sc
  // 좌측 정렬
  const ox = bx + DIM_L
  const oy = by + DIM_T + (availH - sh) / 2

  ctx.save()

  // Posts (grey filled L-simplified)
  ctx.fillStyle = '#b0b0b0'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.5
  ;[[ox, oy], [ox + sw - POST_F * sc, oy]].forEach(([px, py]) => {
    ctx.fillRect(px, py, POST_F * sc, sh)
    ctx.strokeRect(px, py, POST_F * sc, sh)
  })

  // Board fills
  ctx.fillStyle = '#e0d8c8'
  allYs.forEach(yMm => {
    const bt = oy + sh - (yMm + BOARD_T) * sc
    const bth = BOARD_T * sc
    ctx.fillRect(ox, bt, sw, bth)
    ctx.strokeRect(ox, bt, sw, bth)
  })

  // Shelf outline
  ctx.lineWidth = 2.5
  ctx.strokeRect(ox, oy, sw, sh)

  // Feet hidden lines
  ctx.lineWidth = 0.8
  ctx.setLineDash([5, 3])
  ctx.strokeStyle = '#888'
  const footPx = FOOT_H_MM * sc
  ;[ox + POST_F * 0.5 * sc, ox + sw - POST_F * 0.5 * sc].forEach(px => {
    ctx.beginPath()
    ctx.moveTo(px, oy + sh)
    ctx.lineTo(px, oy + sh + footPx)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px - 14, oy + sh + footPx)
    ctx.lineTo(px + 14, oy + sh + footPx)
    ctx.stroke()
  })
  ctx.setLineDash([])
  ctx.restore()

  // Dimensions
  dimH(ctx, ox, ox + sw, oy, -42, `${width}mm`)
  dimV(ctx, oy, oy + sh, ox, -52, `${height}mm`)

  // Shelf-gap dimensions on right side
  const sortedYs = [BOTTOM_Y_MM, ...midYs.sort((a, b) => a - b), topY]
  for (let i = 0; i + 1 < sortedYs.length; i++) {
    const gapMm = sortedYs[i + 1] - sortedYs[i] - BOARD_T
    if (gapMm < 20) continue
    const py1 = oy + sh - sortedYs[i + 1] * sc
    const py2 = oy + sh - (sortedYs[i] + BOARD_T) * sc
    const xOff = 48 + (i % 2) * 46
    dimV(ctx, py1, py2, ox + sw, xOff, `${Math.round(gapMm)}`, 16)
  }

  viewLabel(ctx, '정 면 도  FRONT ELEVATION', bx + bw / 2, by + bh - 26)
}

function drawSideElevation(ctx, params, bx, by, bw, bh) {
  const { height, depth } = params
  const { allYs } = getYs(params)

  const DIM_L = 70
  const DIM_T = 55
  const DIM_R = 60
  const DIM_B = 40
  const availW = bw - DIM_L - DIM_R
  const availH = bh - DIM_T - DIM_B - 30
  const sc = Math.min(availW / depth, availH / height)
  const sw = depth * sc
  const sh = height * sc
  // 좌측 정렬
  const ox = bx + DIM_L
  const oy = by + DIM_T + (availH - sh) / 2

  ctx.save()
  ctx.strokeStyle = '#333'
  ctx.fillStyle = '#b0b0b0'
  ctx.lineWidth = 1.5
  ;[[ox, oy], [ox + sw - POST_F * sc, oy]].forEach(([px, py]) => {
    ctx.fillRect(px, py, POST_F * sc, sh)
    ctx.strokeRect(px, py, POST_F * sc, sh)
  })

  ctx.fillStyle = '#e0d8c8'
  allYs.forEach(yMm => {
    const bt = oy + sh - (yMm + BOARD_T) * sc
    ctx.fillRect(ox, bt, sw, BOARD_T * sc)
    ctx.strokeRect(ox, bt, sw, BOARD_T * sc)
  })
  ctx.lineWidth = 2.5
  ctx.strokeRect(ox, oy, sw, sh)
  ctx.restore()

  dimH(ctx, ox, ox + sw, oy, -38, `${depth}mm`, 18)
  dimV(ctx, oy, oy + sh, ox, -48, `${height}mm`, 18)

  viewLabel(ctx, '측 면 도  SIDE ELEVATION', bx + bw / 2, by + bh - 26)
}

function drawPlanView(ctx, params, bx, by, bw, bh) {
  const { width, depth } = params

  const DIM_L = 65
  const DIM_T = 52
  const DIM_R = 30
  const DIM_B = 40
  const availW = bw - DIM_L - DIM_R
  const availH = bh - DIM_T - DIM_B - 30
  const sc = Math.min(availW / width, availH / depth)
  const sw = width * sc
  const sd = depth * sc
  // 좌측 정렬
  const ox = bx + DIM_L
  const oy = by + DIM_T + (availH - sd) / 2

  ctx.save()
  // Board area
  ctx.fillStyle = '#e0d8c8'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.5
  ctx.fillRect(ox, oy, sw, sd)
  ctx.strokeRect(ox, oy, sw, sd)

  // 4 corner posts
  ctx.fillStyle = '#aaa'
  ;[[ox, oy], [ox + sw - POST_F * sc, oy], [ox, oy + sd - POST_F * sc], [ox + sw - POST_F * sc, oy + sd - POST_F * sc]].forEach(([px, py]) => {
    ctx.fillRect(px, py, POST_F * sc, POST_F * sc)
    ctx.strokeRect(px, py, POST_F * sc, POST_F * sc)
  })

  // Centre lines
  ctx.setLineDash([14, 4, 3, 4])
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(ox + sw / 2, oy - 22); ctx.lineTo(ox + sw / 2, oy + sd + 22); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox - 22, oy + sd / 2); ctx.lineTo(ox + sw + 22, oy + sd / 2); ctx.stroke()
  ctx.setLineDash([])

  // Outline again on top
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#333'
  ctx.strokeRect(ox, oy, sw, sd)
  ctx.restore()

  dimH(ctx, ox, ox + sw, oy, -38, `${width}mm`, 18)
  dimV(ctx, oy, oy + sd, ox, -46, `${depth}mm`, 18)

  viewLabel(ctx, '평 면 도  TOP PLAN', bx + bw / 2, by + bh - 26)
}

function drawIsometric(ctx, params, bx, by, bw, bh) {
  const { width, height, depth } = params
  const { allYs } = getYs(params)

  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = 0.5
  // Scale to fit
  const fitW = bw * 0.78
  const fitH = bh * 0.72
  const sc = Math.min(fitW / (width * cos30 + depth * cos30), fitH / (height + (width + depth) * sin30))

  // Origin at centre-bottom of the isometric box
  const ox = bx + bw / 2 + (depth * cos30 * sc) / 2 - 10
  const oy = by + bh * 0.78

  function iso(x, y, z) {
    return [
      ox + (x - z) * cos30 * sc,
      oy - y * sc - (x + z) * sin30 * sc,
    ]
  }

  const W = width, H = height, D = depth

  function face(pts, fill) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  ctx.save()

  // Bottom face
  face([iso(0,0,0), iso(W,0,0), iso(W,0,D), iso(0,0,D)], '#c8c4bc')

  // Left face (x=0)
  face([iso(0,0,0), iso(0,0,D), iso(0,H,D), iso(0,H,0)], '#d4d0c8')

  // Front face (z=0)
  face([iso(0,0,0), iso(W,0,0), iso(W,H,0), iso(0,H,0)], '#eae6de')

  // Right face (x=W)
  face([iso(W,0,0), iso(W,0,D), iso(W,H,D), iso(W,H,0)], '#c8c4bc')

  // Top face
  face([iso(0,H,0), iso(W,H,0), iso(W,H,D), iso(0,H,D)], '#f0ece4')

  // Shelf boards on front and right faces
  allYs.forEach(yMm => {
    const y0 = yMm, y1 = yMm + BOARD_T
    // Front face
    face([iso(0,y0,0), iso(W,y0,0), iso(W,y1,0), iso(0,y1,0)], '#c0b8a8')
    // Right face
    face([iso(W,y0,0), iso(W,y0,D), iso(W,y1,D), iso(W,y1,0)], '#b0aa9c')
  })

  // Post highlights (front-left, front-right)
  face([iso(0,0,0), iso(POST_F,0,0), iso(POST_F,H,0), iso(0,H,0)], '#a8a4a0')
  face([iso(W-POST_F,0,0), iso(W,0,0), iso(W,H,0), iso(W-POST_F,H,0)], '#a8a4a0')

  ctx.restore()

  // W/H/D annotation lines
  ctx.save()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 0.8
  ctx.setLineDash([4, 3])
  const [aw0, ah0] = iso(0, 0, D)
  const [aw1, ah1] = iso(W, 0, D)
  ctx.beginPath(); ctx.moveTo(aw0, ah0); ctx.lineTo(aw1, ah1); ctx.stroke()
  ctx.setLineDash([])

  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  const [lw, lh] = iso(W / 2, 0, D + 10)
  ctx.fillText(`W: ${W}`, lw, lh + 14)
  const [ld, ldh] = iso(W + 10, H / 2, D / 2)
  ctx.fillText(`D: ${D}`, ld + 20, ldh)
  const [lhx, lhy] = iso(W + 8, H / 2, 0)
  ctx.fillText(`H: ${H}`, lhx + 18, lhy)
  ctx.restore()

  viewLabel(ctx, '등 각 도  ISOMETRIC', bx + bw / 2, by + bh - 26)
}

function drawTitleBlock(ctx, params, bx, by, bw, bh) {
  const { width, height, depth, shelfCount, feetType } = params
  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

  ctx.save()
  ctx.fillStyle = '#f8f6f2'
  ctx.fillRect(bx, by, bw, bh)

  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1.5
  ctx.strokeRect(bx, by, bw, bh)

  const c1 = bw * 0.38
  const c2 = bw * 0.24

  // Column dividers
  ;[c1, c1 + c2].forEach(cx => {
    ctx.beginPath()
    ctx.moveTo(bx + cx, by)
    ctx.lineTo(bx + cx, by + bh)
    ctx.stroke()
  })

  // Row divider
  const rh = bh / 2
  ctx.beginPath()
  ctx.moveTo(bx, by + rh)
  ctx.lineTo(bx + bw, by + rh)
  ctx.stroke()

  // Product title
  ctx.font = 'bold 36px "Orbitron", Arial, sans-serif'
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('DEKIRI 3D', bx + c1 / 2, by + rh * 0.38)

  ctx.font = '20px Arial, sans-serif'
  ctx.fillStyle = '#555'
  ctx.fillText('앵글 선반 기술 도면', bx + c1 / 2, by + rh * 0.72)

  ctx.font = '17px Arial'
  ctx.fillStyle = '#888'
  ctx.fillText('ANGLE SHELF TECHNICAL DRAWING', bx + c1 / 2, by + rh * 0.92)

  // ─ Spec cells ─
  const cells = [
    { label: '규격 (mm)', val: `W${width} × H${height} × D${depth}`, col: c1, row: 0 },
    { label: '선반 수', val: `${shelfCount}단  /  발: ${feetType === 'caster' ? '캐스터' : '수평발'}`, col: c1 + c2, row: 0 },
    { label: '작성일', val: dateStr, col: c1, row: 1 },
    { label: '척도 / SCALE', val: 'NTS  (Not To Scale)', col: c1 + c2, row: 1 },
  ]

  cells.forEach(({ label, val, col, row }) => {
    const cx = bx + col + (col === c1 + c2 ? (bw - c1 - c2) / 2 : c2 / 2) + (col === c1 ? c2 / 2 : (bw - c1 - c2) / 2) - (col === c1 ? c2 / 2 : (bw - c1 - c2) / 2)
    const cellX = bx + col
    const colW = col === c1 ? c2 : (bw - c1 - c2)
    const cellCX = cellX + colW / 2
    const baseY = by + row * rh

    ctx.font = '15px Arial'
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cellCX, baseY + rh * 0.3)

    ctx.font = 'bold 19px "Courier New", monospace'
    ctx.fillStyle = '#111'
    ctx.fillText(val, cellCX, baseY + rh * 0.7)
  })

  ctx.restore()
}

// ─── main ───────────────────────────────────────────────────────

function drawSheet(ctx, params) {
  // Background
  ctx.fillStyle = '#f9f7f4'
  ctx.fillRect(0, 0, CW, CH)

  // Border lines (double)
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 4
  ctx.strokeRect(M, M, CW - 2 * M, CH - 2 * M)
  ctx.lineWidth = 1.2
  ctx.strokeRect(M + 12, M + 12, CW - 2 * M - 24, CH - 2 * M - 24)

  const cx = M + 12
  const cy = M + 12
  const cw = CW - 2 * M - 24
  const ch = CH - 2 * M - 24

  // Title block
  const titleY = cy + ch - TB_H
  drawTitleBlock(ctx, params, cx, titleY, cw, TB_H)

  // Drawing area
  const drawH = ch - TB_H - 6

  const col1W = Math.floor(cw * 0.52)
  const col2W = Math.floor(cw * 0.175)
  const col3W = cw - col1W - col2W
  const row1H = Math.floor(drawH * 0.72)
  const row2H = drawH - row1H

  // Dividers (light dashed)
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 0.8
  ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(cx + col1W, cy); ctx.lineTo(cx + col1W, cy + drawH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + col1W + col2W, cy); ctx.lineTo(cx + col1W + col2W, cy + drawH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy + row1H); ctx.lineTo(cx + col1W + col2W, cy + row1H); ctx.stroke()
  ctx.setLineDash([])

  const p = 6
  drawFrontElevation(ctx, params, cx + p, cy + p, col1W - p * 2, row1H - p * 2)
  drawSideElevation(ctx, params, cx + col1W + p, cy + p, col2W - p * 2, row1H - p * 2)
  drawPlanView(ctx, params, cx + p, cy + row1H + p, col1W + col2W - p * 2, row2H - p * 2)
  drawIsometric(ctx, params, cx + col1W + col2W + p, cy + p, col3W - p * 2, drawH - p * 2)
}

// ─── public API ─────────────────────────────────────────────────

/** Returns an HTMLCanvasElement with the full A3 drawing */
export function generateDimensionCanvas(params) {
  const canvas = document.createElement('canvas')
  canvas.width = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')
  drawSheet(ctx, params)
  return canvas
}

/** Generates and immediately triggers download as PNG */
export function downloadDimensionPNG(params) {
  const canvas = generateDimensionCanvas(params)
  const { width, height, depth } = params
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `DEKIRI_치수도_W${width}H${height}D${depth}.png`
  link.click()
}
