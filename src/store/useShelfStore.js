import { create } from 'zustand'
import { syncToUrl, readFromUrl } from '../utils/urlSync.js'

const MODES = ['shelf', 'washer', 'dressroom', 'aquarium']
const FEET_TYPES = ['level', 'caster']
// 공간 여유 마진 (mm) — 선반 전체 치수에 더해 가상 공간 크기 산정
const SPACE_MARGIN_MM = 200

// 선반 배치에 필요한 공간 계산 헬퍼 (addShelf/removeShelf 공용)
function calcRequiredSpace(shelves, gapMm) {
  const totalW = shelves.reduce((s, sh) => s + sh.width, 0) + (shelves.length - 1) * gapMm
  const maxH   = Math.max(...shelves.map(sh => sh.height))
  const maxD   = Math.max(...shelves.map(sh => sh.depth))
  return {
    needW: totalW + SPACE_MARGIN_MM,
    needH: maxH   + SPACE_MARGIN_MM,
    needD: maxD   + SPACE_MARGIN_MM,
  }
}

// 27.5mm pitch: shelf positions stored as pitch index (integer)
function defaultShelfPositions(count, height) {
  const pitchMm = 27.5
  const totalPitches = Math.floor(height / pitchMm)
  const positions = []
  for (let i = 1; i <= count; i++) {
    positions.push(Math.round((totalPitches / (count + 1)) * i))
  }
  return positions
}

// 선반 인스턴스 config 생성 헬퍼
function makeShelfInstance(id, label, params = {}) {
  const w  = params.width      ?? 900
  const h  = params.height     ?? 2400
  const sc = params.shelfCount ?? 4
  return {
    id, label,
    width:          w,
    height:         h,
    depth:          params.depth          ?? 450,
    shelfCount:     sc,
    shelfPositions: params.shelfPositions ?? defaultShelfPositions(sc, h),
    feetType:       params.feetType       ?? 'level',
    washerWidth:    params.washerWidth    ?? 600,
    washerHeight:   params.washerHeight   ?? 850,
    hangerHeight:   params.hangerHeight   ?? 1400,
    partitionCount: params.partitionCount ?? 2,
    tankSize:       params.tankSize       ?? '60',
  }
}

const urlParams = readFromUrl()
const firstShelf = makeShelfInstance(1, '선반 1', urlParams)

const useShelfStore = create((set, get) => ({
  // ── 전역 (선반 인스턴스별 아님) ─────────────────────────────────────
  mode: urlParams.mode || 'shelf',
  spaceWidth:  urlParams.spaceWidth  || 1100,
  spaceHeight: urlParams.spaceHeight || 2600,
  spaceDepth:  urlParams.spaceDepth  || 650,
  postColor: 'white',
  renderMode: 'realistic',
  selectedShelfIdx: -1,
  arMode: false,
  notification: null,  // { message, id } — 토스트 메시지
  shelfGap: 0,         // 선반 간 간격 (mm) — SliderRow로 조절

  // ── 다중 선반 인스턴스 ────────────────────────────────────────────
  shelves: [firstShelf],
  activeShelfId: 1,
  nextShelfId: 2,

  // ── 활성 선반 파라미터 (기존 컴포넌트 호환용 플랫 복사) ───────────
  width:          firstShelf.width,
  height:         firstShelf.height,
  depth:          firstShelf.depth,
  shelfCount:     firstShelf.shelfCount,
  shelfPositions: firstShelf.shelfPositions,
  feetType:       firstShelf.feetType,
  washerWidth:    firstShelf.washerWidth,
  washerHeight:   firstShelf.washerHeight,
  hangerHeight:   firstShelf.hangerHeight,
  partitionCount: firstShelf.partitionCount,
  tankSize:       firstShelf.tankSize,

  // ── 다중 선반 액션 ─────────────────────────────────────────────────

  // 현재 활성 선반을 복제해 새 인스턴스 추가 + 가상 공간 자동 확대
  addShelf: () => {
    const state      = get()
    const src        = state.shelves.find(s => s.id === state.activeShelfId) || state.shelves[0]
    const newId      = state.nextShelfId
    const newShelf   = makeShelfInstance(newId, `선반 ${newId}`, src)
    const newShelves = [...state.shelves, newShelf]

    const { needW, needH, needD } = calcRequiredSpace(newShelves, state.shelfGap)
    const spaceNeedsResize =
      needW > state.spaceWidth ||
      needH > state.spaceHeight ||
      needD > state.spaceDepth

    const update = { shelves: newShelves, activeShelfId: newId, nextShelfId: newId + 1 }
    if (spaceNeedsResize) {
      update.spaceWidth  = Math.max(state.spaceWidth,  needW)
      update.spaceHeight = Math.max(state.spaceHeight, needH)
      update.spaceDepth  = Math.max(state.spaceDepth,  needD)
      update.notification = { message: '설치 가상공간이 재설정 됩니다.', id: Date.now() }
    }
    set(update)
    syncToUrl(get())
  },

  // 토스트 알림 해제
  clearNotification: () => set({ notification: null }),

  // 선반 간격 변경 — 공간도 자동 재계산
  setShelfGap: (v) => {
    const state = get()
    const { needW, needH, needD } = calcRequiredSpace(state.shelves, v)
    const update = { shelfGap: v }
    if (needW > state.spaceWidth)  update.spaceWidth  = needW
    if (needH > state.spaceHeight) update.spaceHeight = needH
    if (needD > state.spaceDepth)  update.spaceDepth  = needD
    set(update)
    syncToUrl(get())
  },

  // 특정 선반 삭제 (1개 남으면 삭제 불가) + 공간 자동 축소
  removeShelf: (id) => {
    const state     = get()
    if (state.shelves.length <= 1) return
    const remaining = state.shelves.filter(s => s.id !== id)

    // 삭제 후 필요 공간 재계산 → 현재 공간이 과할 경우 축소
    const { needW, needH, needD } = calcRequiredSpace(remaining, state.shelfGap)
    const spaceUpdate = {
      spaceWidth:  Math.max(needW, state.spaceWidth  > needW ? needW : state.spaceWidth),
      spaceHeight: Math.max(needH, state.spaceHeight > needH ? needH : state.spaceHeight),
      spaceDepth:  Math.max(needD, state.spaceDepth  > needD ? needD : state.spaceDepth),
    }

    if (id !== state.activeShelfId) {
      set({ shelves: remaining, ...spaceUpdate })
      syncToUrl(get())
      return
    }
    const idx  = state.shelves.findIndex(s => s.id === id)
    const next = remaining[Math.max(0, idx - 1)]
    set({
      shelves: remaining,
      activeShelfId:  next.id,
      width:          next.width,
      height:         next.height,
      depth:          next.depth,
      shelfCount:     next.shelfCount,
      shelfPositions: next.shelfPositions,
      feetType:       next.feetType,
      washerWidth:    next.washerWidth,
      washerHeight:   next.washerHeight,
      hangerHeight:   next.hangerHeight,
      partitionCount: next.partitionCount,
      tankSize:       next.tankSize,
      ...spaceUpdate,
    })
    syncToUrl(get())
  },

  // 활성 선반 전환: 해당 선반 파라미터를 flat state 에도 반영
  setActiveShelf: (id) => {
    const { shelves } = get()
    const shelf = shelves.find(s => s.id === id)
    if (!shelf) return
    set({
      activeShelfId:  id,
      width:          shelf.width,
      height:         shelf.height,
      depth:          shelf.depth,
      shelfCount:     shelf.shelfCount,
      shelfPositions: shelf.shelfPositions,
      feetType:       shelf.feetType,
      washerWidth:    shelf.washerWidth,
      washerHeight:   shelf.washerHeight,
      hangerHeight:   shelf.hangerHeight,
      partitionCount: shelf.partitionCount,
      tankSize:       shelf.tankSize,
    })
    syncToUrl(get())
  },

  // ── 기존 setters (shelves 배열도 동기 업데이트) ──────────────────

  setMode: (mode) => { set({ mode }); syncToUrl(get()) },

  setWidth: (width) => {
    set(state => ({
      width,
      shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, width } : s),
    }))
    syncToUrl(get())
  },

  setHeight: (height) => {
    const { shelfCount, activeShelfId } = get()
    const positions = defaultShelfPositions(shelfCount, height)
    set(state => ({
      height, shelfPositions: positions,
      shelves: state.shelves.map(s =>
        s.id === activeShelfId ? { ...s, height, shelfPositions: positions } : s),
    }))
    syncToUrl(get())
  },

  setDepth: (depth) => {
    set(state => ({
      depth,
      shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, depth } : s),
    }))
    syncToUrl(get())
  },

  setShelfCount: (count) => {
    const { height, activeShelfId } = get()
    const positions = defaultShelfPositions(count, height)
    set(state => ({
      shelfCount: count, shelfPositions: positions,
      shelves: state.shelves.map(s =>
        s.id === activeShelfId ? { ...s, shelfCount: count, shelfPositions: positions } : s),
    }))
    syncToUrl(get())
  },

  setShelfPosition: (idx, pitchIndex) => {
    const positions = [...get().shelfPositions]
    positions[idx] = pitchIndex
    set(state => ({
      shelfPositions: positions,
      shelves: state.shelves.map(s =>
        s.id === state.activeShelfId ? { ...s, shelfPositions: positions } : s),
    }))
    syncToUrl(get())
  },

  setFeetType: (feetType) => {
    set(state => ({
      feetType,
      shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, feetType } : s),
    }))
    syncToUrl(get())
  },

  setRenderMode:      (renderMode)      => set({ renderMode }),
  setSelectedShelfIdx:(idx)             => set({ selectedShelfIdx: idx }),
  setArMode:          (arMode)          => set({ arMode }),
  setPostColor:       (v)               => set({ postColor: v }),

  setSpaceWidth:  (v) => { set({ spaceWidth: v });  syncToUrl(get()) },
  setSpaceHeight: (v) => { set({ spaceHeight: v }); syncToUrl(get()) },
  setSpaceDepth:  (v) => { set({ spaceDepth: v });  syncToUrl(get()) },

  setWasherWidth:     (v) => set(state => ({ washerWidth: v,     shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, washerWidth: v }     : s) })),
  setWasherHeight:    (v) => set(state => ({ washerHeight: v,    shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, washerHeight: v }    : s) })),
  setHangerHeight:    (v) => set(state => ({ hangerHeight: v,    shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, hangerHeight: v }    : s) })),
  setPartitionCount:  (v) => set(state => ({ partitionCount: v,  shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, partitionCount: v }  : s) })),
  setTankSize:        (v) => set(state => ({ tankSize: v,        shelves: state.shelves.map(s => s.id === state.activeShelfId ? { ...s, tankSize: v }        : s) })),
}))

export default useShelfStore
export { MODES, FEET_TYPES, defaultShelfPositions }
