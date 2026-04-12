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
function dimH(ctx, x1, x2, refY, offset, label, fs = 28) {
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
function dimV(ctx, y1, y2, refX, offset, label, fs = 28) {
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
  ctx.font = 'bold 30px Arial, sans-serif'
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

function drawFrontElevation(ctx, data, bx, by, bw, bh) {
  ctx.save()
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip()

  const shelves = data.shelves || [data]
  const gap = data.shelfGap || 0
  const multi = shelves.length > 1

  const totalWidth = shelves.reduce((s, sh) => s + sh.width, 0) + (shelves.length - 1) * gap
  const maxHeight = Math.max(...shelves.map(s => s.height))

  const DIM_L = 80
  const DIM_T = multi ? 100 : 60
  const DIM_R = 110
  const DIM_B = 40
  const availW = bw - DIM_L - DIM_R
  const availH = bh - DIM_T - DIM_B - 30
  const sc = Math.min(availW / totalWidth, availH / maxHeight)
  const maxSH = maxHeight * sc
  const ox = bx + DIM_L
  const oy = by + DIM_T + (availH - maxSH) / 2

  // ── 각 선반 그리기 ──
  let curX = 0
  shelves.forEach((shelf, idx) => {
    const { width, height } = shelf
    const { topY, midYs, allYs } = getYs(shelf)
    const sw = width * sc
    const sh = height * sc
    const sx = ox + curX * sc
    const sy = oy + maxSH - sh   // 바닥 정렬

    ctx.save()

    // Boards FIRST (so posts render on top at board heights)
    ctx.fillStyle = '#e0d8c8'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    allYs.forEach(yMm => {
      const bt = sy + sh - (yMm + BOARD_T) * sc
      ctx.fillRect(sx, bt, sw, BOARD_T * sc)
      ctx.strokeRect(sx, bt, sw, BOARD_T * sc)
    })

    // Posts ON TOP (cover boards, keep column visible at all heights)
    ctx.fillStyle = '#b0b0b0'
    ctx.lineWidth = 1.5
    ;[[sx, sy], [sx + sw - POST_F * sc, sy]].forEach(([px, py]) => {
      ctx.fillRect(px, py, POST_F * sc, sh)
      ctx.strokeRect(px, py, POST_F * sc, sh)
    })

    // Outline
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#333'
    ctx.strokeRect(sx, sy, sw, sh)

    // Feet
    ctx.lineWidth = 0.8
    ctx.setLineDash([5, 3])
    ctx.strokeStyle = '#888'
    const footPx = FOOT_H_MM * sc
    ;[sx + POST_F * 0.5 * sc, sx + sw - POST_F * 0.5 * sc].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, sy + sh); ctx.lineTo(px, sy + sh + footPx); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px - 14, sy + sh + footPx); ctx.lineTo(px + 14, sy + sh + footPx); ctx.stroke()
    })
    ctx.setLineDash([])
    ctx.restore()

    // 개별 너비 치수
    dimH(ctx, sx, sx + sw, sy, -42, `${width}mm`)

    // 선반 라벨 (다중일 때) — 수직 중앙에 표시
    if (multi) {
      ctx.save()
      ctx.font = 'bold 16px Arial, sans-serif'
      ctx.fillStyle = '#f97316'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`선반 ${idx + 1}`, sx + sw / 2, sy + sh / 2)
      ctx.restore()
    }

    // 선반판 간격 치수 (우측) — 마지막 선반에만
    if (idx === shelves.length - 1) {
      const sortedYs = [BOTTOM_Y_MM, ...midYs.sort((a, b) => a - b), topY]
      for (let i = 0; i + 1 < sortedYs.length; i++) {
        const gapMm = sortedYs[i + 1] - sortedYs[i] - BOARD_T
        if (gapMm < 20) continue
        const py1 = sy + sh - sortedYs[i + 1] * sc
        const py2 = sy + sh - (sortedYs[i] + BOARD_T) * sc
        const xOff = 48 + (i % 2) * 46
        dimV(ctx, py1, py2, sx + sw, xOff, `${Math.round(gapMm)}`, 16)
      }
    }

    curX += width + gap
  })

  // 전체 폭 치수 (다중일 때)
  const totalSW = totalWidth * sc
  if (multi) {
    dimH(ctx, ox, ox + totalSW, oy, -78, `전체 ${totalWidth}mm`, 18)
  }

  // 높이 치수 (좌측, 가장 높은 선반)
  dimV(ctx, oy, oy + maxSH, ox, -52, `${maxHeight}mm`)

  viewLabel(ctx, '정 면 도  FRONT ELEVATION', bx + bw / 2, by + bh - 26)
  ctx.restore()
}

function drawSideElevation(ctx, params, bx, by, bw, bh) {
  ctx.save()
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip()

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
  ctx.restore()
}

function drawPlanView(ctx, data, bx, by, bw, bh) {
  ctx.save()
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip()

  const shelves = data.shelves || [data]
  const gap = data.shelfGap || 0
  const multi = shelves.length > 1

  const totalWidth = shelves.reduce((s, sh) => s + sh.width, 0) + (shelves.length - 1) * gap
  const maxDepth = Math.max(...shelves.map(s => s.depth))

  const DIM_L = 65
  const DIM_T = multi ? 72 : 52
  const DIM_R = 30
  const DIM_B = 40
  const availW = bw - DIM_L - DIM_R
  const availH = bh - DIM_T - DIM_B - 30
  const sc = Math.min(availW / totalWidth, availH / maxDepth)
  const maxSD = maxDepth * sc
  const ox = bx + DIM_L
  const oy = by + DIM_T + (availH - maxSD) / 2

  let curX = 0
  shelves.forEach((shelf) => {
    const { width, depth } = shelf
    const sw = width * sc
    const sd = depth * sc
    const sx = ox + curX * sc
    const sy = oy + (maxSD - sd) / 2   // 깊이 중앙 정렬

    ctx.save()
    // Board area
    ctx.fillStyle = '#e0d8c8'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    ctx.fillRect(sx, sy, sw, sd)
    ctx.strokeRect(sx, sy, sw, sd)

    // 4 corner posts
    ctx.fillStyle = '#aaa'
    const pf = POST_F * sc
    ;[[sx, sy], [sx + sw - pf, sy], [sx, sy + sd - pf], [sx + sw - pf, sy + sd - pf]].forEach(([px, py]) => {
      ctx.fillRect(px, py, pf, pf)
      ctx.strokeRect(px, py, pf, pf)
    })

    // Centre lines
    ctx.setLineDash([14, 4, 3, 4])
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(sx + sw / 2, sy - 16); ctx.lineTo(sx + sw / 2, sy + sd + 16); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(sx - 16, sy + sd / 2); ctx.lineTo(sx + sw + 16, sy + sd / 2); ctx.stroke()
    ctx.setLineDash([])

    // Outline
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#333'
    ctx.strokeRect(sx, sy, sw, sd)
    ctx.restore()

    curX += width + gap
  })

  // 치수
  const totalSW = totalWidth * sc
  if (multi) {
    dimH(ctx, ox, ox + totalSW, oy, -52, `전체 ${totalWidth}mm`, 16)
  }
  dimH(ctx, ox, ox + shelves[0].width * sc, oy, -32, `${shelves[0].width}mm`, 18)
  dimV(ctx, oy, oy + maxSD, ox, -46, `${maxDepth}mm`, 18)

  viewLabel(ctx, '평 면 도  TOP PLAN', bx + bw / 2, by + bh - 26)
  ctx.restore()
}

function drawIsometric(ctx, data, bx, by, bw, bh) {
  ctx.save()
  ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip()

  const shelves = data.shelves || [data]
  const gap = data.shelfGap || 0

  const totalWidth = shelves.reduce((s, sh) => s + sh.width, 0) + (shelves.length - 1) * gap
  const maxH = Math.max(...shelves.map(s => s.height))
  const maxD = Math.max(...shelves.map(s => s.depth))

  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = 0.5
  const fitW = bw * 0.78
  const fitH = bh * 0.72
  const sc = Math.min(fitW / (totalWidth * cos30 + maxD * cos30), fitH / (maxH + (totalWidth + maxD) * sin30))

  const baseOx = bx + bw / 2 + (maxD - totalWidth) * cos30 * sc / 2
  const baseOy = by + bh * 0.78

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

  // ── 각 선반 그리기 (뒤→앞 순서로 z-sort) ──
  let curX = 0
  shelves.forEach((shelf) => {
    const { width: W, height: H, depth: D } = shelf
    const { allYs } = getYs(shelf)
    const dx = curX

    function iso(x, y, z) {
      return [
        baseOx + (x + dx - z) * cos30 * sc,
        baseOy - y * sc - (x + dx + z) * sin30 * sc,
      ]
    }

    face([iso(0,0,0), iso(W,0,0), iso(W,0,D), iso(0,0,D)], '#c8c4bc')
    face([iso(0,0,0), iso(0,0,D), iso(0,H,D), iso(0,H,0)], '#d4d0c8')
    face([iso(0,0,0), iso(W,0,0), iso(W,H,0), iso(0,H,0)], '#eae6de')
    face([iso(W,0,0), iso(W,0,D), iso(W,H,D), iso(W,H,0)], '#c8c4bc')
    face([iso(0,H,0), iso(W,H,0), iso(W,H,D), iso(0,H,D)], '#f0ece4')

    allYs.forEach(yMm => {
      const y0 = yMm, y1 = yMm + BOARD_T
      face([iso(0,y0,0), iso(W,y0,0), iso(W,y1,0), iso(0,y1,0)], '#c0b8a8')
      face([iso(W,y0,0), iso(W,y0,D), iso(W,y1,D), iso(W,y1,0)], '#b0aa9c')
    })

    face([iso(0,0,0), iso(POST_F,0,0), iso(POST_F,H,0), iso(0,H,0)], '#a8a4a0')
    face([iso(W-POST_F,0,0), iso(W,0,0), iso(W,H,0), iso(W-POST_F,H,0)], '#a8a4a0')

    curX += W + gap
  })

  ctx.restore()

  // W/H/D annotations — 전체 기준
  const repShelf = shelves[0]
  const TW = totalWidth, TH = maxH, TD = maxD
  function isoA(x, y, z) {
    return [baseOx + (x - z) * cos30 * sc, baseOy - y * sc - (x + z) * sin30 * sc]
  }

  ctx.save()
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 0.8
  ctx.setLineDash([4, 3])
  const [aw0, ah0] = isoA(0, 0, TD)
  const [aw1, ah1] = isoA(TW, 0, TD)
  ctx.beginPath(); ctx.moveTo(aw0, ah0); ctx.lineTo(aw1, ah1); ctx.stroke()
  ctx.setLineDash([])

  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  const [lw, lh] = isoA(TW / 2, 0, TD + 10)
  ctx.fillText(`W: ${TW}`, lw, lh + 14)
  const [ld, ldh] = isoA(TW + 10, TH / 2, TD / 2)
  ctx.fillText(`D: ${repShelf.depth}`, ld + 20, ldh)
  const [lhx, lhy] = isoA(TW + 8, TH / 2, 0)
  ctx.fillText(`H: ${maxH}`, lhx + 18, lhy)
  ctx.restore()

  viewLabel(ctx, '등 각 도  ISOMETRIC', bx + bw / 2, by + bh - 26)
  ctx.restore()
}

function drawTitleBlock(ctx, data, bx, by, bw, bh) {
  const shelves = data.shelves || [data]
  const gap = data.shelfGap || 0
  const totalWidth = shelves.reduce((s, sh) => s + sh.width, 0) + (shelves.length - 1) * gap
  const multi = shelves.length > 1

  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

  ctx.save()
  ctx.fillStyle = '#f8f6f2'
  ctx.fillRect(bx, by, bw, bh)

  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1.5
  ctx.strokeRect(bx, by, bw, bh)

  const c1 = bw * 0.30
  const c2 = bw * 0.40
  const c3 = bw - c1 - c2

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

  // ── 좌측: 제품 타이틀 ──
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

  // ── 중앙: 선반 규격 (선반별) ──
  const specCX = bx + c1 + c2 / 2
  ctx.font = '14px Arial'
  ctx.fillStyle = '#888'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('선반 규격', specCX, by + rh * 0.16)

  const lineH = multi ? Math.min(32, (rh * 0.7) / shelves.length) : 36
  const startY = by + rh * 0.35
  shelves.forEach((shelf, i) => {
    const { width, height, depth, shelfCount, feetType } = shelf
    const label = multi ? `선반 ${i + 1}: ` : ''
    const feet = feetType === 'caster' ? '캐스터' : '수평발'
    const text = `${label}W${width}×H${height}×D${depth} / ${shelfCount}단 / ${feet}`
    ctx.font = `bold ${multi ? 15 : 18}px "Courier New", monospace`
    ctx.fillStyle = '#111'
    ctx.fillText(text, specCX, startY + i * lineH)
  })

  // 전체 설치 폭 (다중일 때)
  if (multi) {
    ctx.font = 'bold 16px "Courier New", monospace'
    ctx.fillStyle = '#f97316'
    ctx.fillText(`전체 설치 폭: ${totalWidth}mm`, specCX, by + rh * 0.88)
  }

  // ── 우측: 작성일 / 척도 ──
  const rightCX = bx + c1 + c2 + c3 / 2

  ctx.font = '14px Arial'
  ctx.fillStyle = '#888'
  ctx.fillText('작성일', rightCX, by + rh * 0.3)
  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillStyle = '#111'
  ctx.fillText(dateStr, rightCX, by + rh * 0.7)

  ctx.font = '14px Arial'
  ctx.fillStyle = '#888'
  ctx.fillText('척도 / SCALE', rightCX, by + rh + rh * 0.3)
  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillStyle = '#111'
  ctx.fillText('NTS  (Not To Scale)', rightCX, by + rh + rh * 0.7)

  ctx.restore()
}

// ─── layout engine ──────────────────────────────────────────────

/**
 * Returns { front, side, plan, iso } cell positions (relative to drawing area origin)
 * and an array of divider lines { v: x } | { h: y, x1, x2 }.
 * iso may be null for layouts that omit it.
 */
function getLayout(layout, drawH, cw) {
  const p = 6  // inner padding per cell

  switch (layout) {
    case 'front-focus': {
      // Left 60%: front full height | Right 40%: side / plan / iso stacked
      const lW = Math.floor(cw * 0.60)
      const rW = cw - lW
      const rH = Math.floor(drawH / 3)
      return {
        cells: {
          front: { x: p,          y: p,              w: lW - p * 2,       h: drawH - p * 2 },
          side:  { x: lW + p,     y: p,              w: rW - p * 2,       h: rH - p * 2 },
          plan:  { x: lW + p,     y: rH + p,         w: rW - p * 2,       h: rH - p * 2 },
          iso:   { x: lW + p,     y: rH * 2 + p,     w: rW - p * 2,       h: drawH - rH * 2 - p * 2 },
        },
        divs: [
          { v: lW,  y1: 0,    y2: drawH },
          { h: rH,  x1: lW,   x2: cw },
          { h: rH * 2, x1: lW, x2: cw },
        ],
      }
    }
    case 'iso-focus': {
      // Left 38%: front / side / plan stacked | Right 62%: iso full height
      const lW = Math.floor(cw * 0.38)
      const rW = cw - lW
      const rH = Math.floor(drawH / 3)
      return {
        cells: {
          front: { x: p,       y: p,          w: lW - p * 2, h: rH - p * 2 },
          side:  { x: p,       y: rH + p,     w: lW - p * 2, h: rH - p * 2 },
          plan:  { x: p,       y: rH * 2 + p, w: lW - p * 2, h: drawH - rH * 2 - p * 2 },
          iso:   { x: lW + p,  y: p,          w: rW - p * 2, h: drawH - p * 2 },
        },
        divs: [
          { v: lW,     y1: 0,  y2: drawH },
          { h: rH,     x1: 0,  x2: lW },
          { h: rH * 2, x1: 0,  x2: lW },
        ],
      }
    }
    case '3views': {
      // 3 equal columns: front | side | plan (iso omitted)
      const w1 = Math.floor(cw * 0.40)
      const w2 = Math.floor(cw * 0.22)
      const w3 = cw - w1 - w2
      return {
        cells: {
          front: { x: p,           y: p, w: w1 - p * 2,       h: drawH - p * 2 },
          side:  { x: w1 + p,      y: p, w: w2 - p * 2,       h: drawH - p * 2 },
          plan:  { x: w1 + w2 + p, y: p, w: w3 - p * 2,       h: drawH - p * 2 },
          iso:   null,
        },
        divs: [
          { v: w1,       y1: 0, y2: drawH },
          { v: w1 + w2,  y1: 0, y2: drawH },
        ],
      }
    }
    default: {
      // 'default': current 2×2 layout
      const col1W = Math.floor(cw * 0.52)
      const col2W = Math.floor(cw * 0.175)
      const col3W = cw - col1W - col2W
      const row1H = Math.floor(drawH * 0.72)
      const row2H = drawH - row1H
      return {
        cells: {
          front: { x: p,                    y: p,          w: col1W - p * 2,            h: row1H - p * 2 },
          side:  { x: col1W + p,            y: p,          w: col2W - p * 2,            h: row1H - p * 2 },
          plan:  { x: p,                    y: row1H + p,  w: col1W + col2W - p * 2,    h: row2H - p * 2 },
          iso:   { x: col1W + col2W + p,    y: p,          w: col3W - p * 2,            h: drawH - p * 2 },
        },
        divs: [
          { v: col1W,          y1: 0,     y2: drawH },
          { v: col1W + col2W,  y1: 0,     y2: drawH },
          { h: row1H,          x1: 0,     x2: col1W + col2W },
        ],
      }
    }
  }
}

// ─── main ───────────────────────────────────────────────────────

function drawSheet(ctx, data, layout = 'default') {
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
  drawTitleBlock(ctx, data, cx, titleY, cw, TB_H)

  // Drawing area
  const drawH = ch - TB_H - 6
  const { cells, divs } = getLayout(layout, drawH, cw)

  // Dividers (light dashed)
  ctx.save()
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 0.8
  ctx.setLineDash([6, 4])
  for (const d of divs) {
    ctx.beginPath()
    if ('v' in d) {
      ctx.moveTo(cx + d.v, cy + d.y1)
      ctx.lineTo(cx + d.v, cy + d.y2)
    } else {
      ctx.moveTo(cx + d.x1, cy + d.h)
      ctx.lineTo(cx + d.x2, cy + d.h)
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()

  // 측면도는 대표 선반 (가장 높은) 1개로 표시
  const shelves = data.shelves || [data]
  const repShelf = shelves.reduce((best, s) => s.height > best.height ? s : best, shelves[0])

  const { front, side, plan, iso } = cells
  drawFrontElevation(ctx, data,     cx + front.x, cy + front.y, front.w, front.h)
  drawSideElevation(ctx, repShelf,  cx + side.x,  cy + side.y,  side.w,  side.h)
  drawPlanView(ctx, data,           cx + plan.x,  cy + plan.y,  plan.w,  plan.h)
  if (iso) drawIsometric(ctx, data, cx + iso.x,   cy + iso.y,   iso.w,   iso.h)
}

// ─── public API ─────────────────────────────────────────────────

/**
 * Returns an HTMLCanvasElement with the full A3 drawing.
 * data   = { shelves: [...], shelfGap: number, mode: string }
 * scale  = pixel multiplier — 1 = 150 DPI preview, 2 = 300 DPI print quality
 */
export function generateDimensionCanvas(data, layout = 'default', scale = 1) {
  const canvas = document.createElement('canvas')
  canvas.width  = CW * scale
  canvas.height = CH * scale
  const ctx = canvas.getContext('2d')
  if (scale !== 1) ctx.scale(scale, scale)
  drawSheet(ctx, data, layout)
  return canvas
}

/** Generates and immediately triggers PNG download at 300 DPI (2× canvas). */
export function downloadDimensionPNG(data, layout = 'default') {
  const canvas = generateDimensionCanvas(data, layout, 2)   // 300 DPI
  const shelves = data.shelves || [data]
  const first = shelves[0]
  const tag = shelves.length > 1 ? `_x${shelves.length}` : ''
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `DEKIRI_치수도_W${first.width}H${first.height}D${first.depth}${tag}.png`
  link.click()
}

/**
 * Generates an A3 PDF (landscape) with the drawing at 300 DPI embedded as a
 * high-resolution image.  Text and lines are rendered at 2× pixel density so
 * they remain sharp when the PDF is viewed at up to 3–4× zoom or printed.
 */
export async function downloadDimensionPDF(data, layout = 'default') {
  const { jsPDF } = await import('jspdf')

  // 300 DPI canvas (scale=2)
  const canvas = generateDimensionCanvas(data, layout, 2)
  const imgData = canvas.toDataURL('image/jpeg', 0.97)  // JPEG keeps file small

  // A3 landscape: 420 × 297 mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
  doc.addImage(imgData, 'JPEG', 0, 0, 420, 297)

  const shelves = data.shelves || [data]
  const first = shelves[0]
  const tag = shelves.length > 1 ? `_x${shelves.length}` : ''
  doc.save(`DEKIRI_치수도_W${first.width}H${first.height}D${first.depth}${tag}.pdf`)
}
