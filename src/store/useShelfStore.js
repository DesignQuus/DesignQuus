import { create } from 'zustand'
import { syncToUrl, readFromUrl } from '../utils/urlSync.js'

const MODES = ['shelf', 'washer', 'dressroom', 'aquarium']
const FEET_TYPES = ['level', 'caster']

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

const urlParams = readFromUrl()

const useShelfStore = create((set, get) => ({
  // active product mode
  mode: urlParams.mode || 'shelf',

  // main dimensions (mm) — 선반 규격
  width: urlParams.width || 900,
  height: urlParams.height || 2400,
  depth: urlParams.depth || 450,

  // installation space dimensions (mm) — 설치 가상 공간
  spaceWidth:  urlParams.spaceWidth  || 1100,
  spaceHeight: urlParams.spaceHeight || 2600,
  spaceDepth:  urlParams.spaceDepth  || 650,

  // 단 / 칸 수 정의 (2026-04-11)
  // ┌─────────────────────────────────────────────────────────────┐
  // │  shelfCount  = 중간 선반판 수 (내부 슬라이더 값)              │
  // │  단 (단수)   = shelfCount + 1  (중간판 + 상단 또는 하단 1개) │
  // │  칸 (칸수)   = shelfCount + 2  (단 사이 열린 공간 수)        │
  // │  예시: shelfCount=2 → 3단 / 4칸                             │
  // └─────────────────────────────────────────────────────────────┘
  shelfCount: urlParams.shelfCount || 4,

  // shelf Y positions as pitch indices (27.5mm each)
  shelfPositions: urlParams.shelfPositions || defaultShelfPositions(urlParams.shelfCount || 4, urlParams.height || 2400),

  // feet type
  feetType: urlParams.feetType || 'level',

  // post color
  postColor: 'black',

  // render mode
  renderMode: 'realistic', // 'realistic' | 'technical'

  // selected shelf index for interactive drag (-1 = none)
  selectedShelfIdx: -1,

  // AR photo mode
  arMode: false,

  // washer-specific
  washerWidth: 600,
  washerHeight: 850,

  // dressroom-specific
  hangerHeight: 1400,
  partitionCount: 2,

  // aquarium-specific
  tankSize: '60', // '60' | '90' | '120'

  // actions
  setMode: (mode) => {
    set({ mode })
    syncToUrl(get())
  },

  setWidth: (width) => {
    set({ width })
    syncToUrl(get())
  },

  setHeight: (height) => {
    const { shelfCount } = get()
    set({ height, shelfPositions: defaultShelfPositions(shelfCount, height) })
    syncToUrl(get())
  },

  setDepth: (depth) => {
    set({ depth })
    syncToUrl(get())
  },

  setShelfCount: (count) => {
    const { height } = get()
    set({ shelfCount: count, shelfPositions: defaultShelfPositions(count, height) })
    syncToUrl(get())
  },

  setShelfPosition: (idx, pitchIndex) => {
    const positions = [...get().shelfPositions]
    positions[idx] = pitchIndex
    set({ shelfPositions: positions })
    syncToUrl(get())
  },

  setFeetType: (feetType) => {
    set({ feetType })
    syncToUrl(get())
  },

  setRenderMode: (renderMode) => set({ renderMode }),

  setSelectedShelfIdx: (idx) => set({ selectedShelfIdx: idx }),

  setArMode: (arMode) => set({ arMode }),

  setSpaceWidth:  (v) => { set({ spaceWidth: v });  syncToUrl(get()) },
  setSpaceHeight: (v) => { set({ spaceHeight: v }); syncToUrl(get()) },
  setSpaceDepth:  (v) => { set({ spaceDepth: v });  syncToUrl(get()) },

  setWasherWidth: (v) => set({ washerWidth: v }),
  setWasherHeight: (v) => set({ washerHeight: v }),
  setHangerHeight: (v) => set({ hangerHeight: v }),
  setPartitionCount: (v) => set({ partitionCount: v }),
  setTankSize: (v) => set({ tankSize: v }),
  setPostColor: (v) => set({ postColor: v }),
}))

export default useShelfStore
export { MODES, FEET_TYPES, defaultShelfPositions }
