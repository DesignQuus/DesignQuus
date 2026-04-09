// BOM (Bill of Materials) calculator
// Computes required parts and quantities from shelf parameters

export function calculateBOM({ mode, width, height, depth, shelfCount, feetType }) {
  const bom = []

  // Angle posts (4 corner posts)
  bom.push({
    name: '앵글 포스트',
    spec: `${height}mm`,
    qty: 4,
    unit: '개',
  })

  // Boards: top + bottom + shelves
  const boardCount = shelfCount + 2 // +2 for top and bottom
  bom.push({
    name: '선반판',
    spec: `${width}×${depth}mm`,
    qty: boardCount,
    unit: '개',
  })

  // Feet
  if (feetType === 'level') {
    bom.push({
      name: '수평 조절발',
      spec: 'M10',
      qty: 4,
      unit: '개',
    })
  } else {
    bom.push({
      name: '캐스터 (바퀴)',
      spec: 'Ø50mm',
      qty: 4,
      unit: '개',
    })
  }

  // Mode-specific parts
  if (mode === 'washer') {
    bom.push({
      name: '사이드 프레임',
      spec: `${height}mm`,
      qty: 2,
      unit: '개',
    })
  }

  if (mode === 'dressroom') {
    bom.push({
      name: '행거봉',
      spec: `${width - 40}mm`,
      qty: 1,
      unit: '개',
    })
    bom.push({
      name: '행거봉 브라켓',
      spec: '',
      qty: 2,
      unit: '개',
    })
  }

  if (mode === 'aquarium') {
    bom.push({
      name: '방수 트레이',
      spec: `${width}×${depth}mm`,
      qty: 1,
      unit: '개',
    })
  }

  return bom
}
