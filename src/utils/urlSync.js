// URL ↔ shelf state synchronization

export function syncToUrl(state) {
  const params = new URLSearchParams({
    mode: state.mode,
    w: state.width,
    h: state.height,
    d: state.depth,
    s: state.shelfCount,
    f: state.feetType,
    pos: state.shelfPositions.join(','),
  })
  window.history.replaceState(null, '', `?${params.toString()}`)
}

export function readFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const result = {}

  if (params.has('mode')) result.mode = params.get('mode')
  if (params.has('w')) result.width = Number(params.get('w'))
  if (params.has('h')) result.height = Number(params.get('h'))
  if (params.has('d')) result.depth = Number(params.get('d'))
  if (params.has('s')) result.shelfCount = Number(params.get('s'))
  if (params.has('f')) result.feetType = params.get('f')
  if (params.has('pos')) {
    const positions = params.get('pos').split(',').map(Number).filter(n => !isNaN(n))
    if (positions.length > 0) result.shelfPositions = positions
  }

  return result
}
