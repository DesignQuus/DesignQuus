// BOM (Bill of Materials) calculator
// Computes required parts and quantities from all shelf instances

export function calculateBOM({ mode, shelves }) {
  if (!shelves || shelves.length === 0) return []

  const bom = []

  // ── 포스트: 높이별 집계 ─────────────────────────────────────────
  const postByHeight = {}
  shelves.forEach(({ height }) => {
    postByHeight[height] = (postByHeight[height] || 0) + 4
  })
  Object.entries(postByHeight).forEach(([h, qty]) => {
    bom.push({ name: '앵글 포스트', spec: `${h}mm`, qty, unit: '개' })
  })

  // ── 선반판: 너비×깊이 + 단수별 집계 ────────────────────────────
  const boardBySpec = {}
  shelves.forEach(({ width, depth, shelfCount }) => {
    const key = `${width}x${depth}`
    if (!boardBySpec[key]) boardBySpec[key] = { width, depth, qty: 0 }
    boardBySpec[key].qty += shelfCount + 2   // 바닥+천장 포함
  })
  Object.values(boardBySpec).forEach(({ width, depth, qty }) => {
    bom.push({ name: '선반판', spec: `${width}×${depth}mm`, qty, unit: '개' })
  })

  // ── 발: 타입별 집계 ─────────────────────────────────────────────
  const feetByType = {}
  shelves.forEach(({ feetType }) => {
    const t = feetType || 'level'
    feetByType[t] = (feetByType[t] || 0) + 4
  })
  Object.entries(feetByType).forEach(([type, qty]) => {
    if (type === 'level') {
      bom.push({ name: '수평 조절발', spec: 'M10', qty, unit: '개' })
    } else {
      bom.push({ name: '캐스터 (바퀴)', spec: 'Ø50mm', qty, unit: '개' })
    }
  })

  // ── 모드별 추가 부품 ─────────────────────────────────────────────
  if (mode === 'washer') {
    const maxH = Math.max(...shelves.map(s => s.height))
    bom.push({ name: '사이드 프레임', spec: `${maxH}mm`, qty: 2, unit: '개' })
  }

  if (mode === 'dressroom') {
    const rodByLen = {}
    shelves.forEach(({ width }) => {
      const len = width - 40
      rodByLen[len] = (rodByLen[len] || 0) + 1
    })
    Object.entries(rodByLen).forEach(([len, qty]) => {
      bom.push({ name: '행거봉', spec: `${len}mm`, qty, unit: '개' })
    })
    bom.push({ name: '행거봉 브라켓', spec: '', qty: shelves.length * 2, unit: '개' })
  }

  if (mode === 'aquarium') {
    const trayBySpec = {}
    shelves.forEach(({ width, depth }) => {
      const key = `${width}x${depth}`
      if (!trayBySpec[key]) trayBySpec[key] = { width, depth, qty: 0 }
      trayBySpec[key].qty++
    })
    Object.values(trayBySpec).forEach(({ width, depth, qty }) => {
      bom.push({ name: '방수 트레이', spec: `${width}×${depth}mm`, qty, unit: '개' })
    })
  }

  return bom
}
