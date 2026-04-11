import { create } from 'zustand'
import savedOffsets from '../config/partOffsets.json'

export const isDev = new URLSearchParams(window.location.search).get('dev') === '1'

export const ZERO = { dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0 }

const useDevStore = create((set, get) => ({
  selectedIds: [],   // array — last item = primary (for field editor)
  offsets: { ...savedOffsets },
  registeredIds: new Set(),
  basePosMap: {},    // { partId: { x, y, z } } in mm — for alignment math

  // ── Selection ──────────────────────────────────────────────────────────────
  toggleSelect: (id, shiftKey = false) => set(s => {
    if (!shiftKey) {
      // Single click: toggle if already sole selection, otherwise select only this
      if (s.selectedIds.length === 1 && s.selectedIds[0] === id) {
        return { selectedIds: [] }
      }
      return { selectedIds: [id] }
    }
    // Shift+click: add or remove from selection
    const has = s.selectedIds.includes(id)
    return {
      selectedIds: has
        ? s.selectedIds.filter(i => i !== id)
        : [...s.selectedIds, id],
    }
  }),

  clear: () => set({ selectedIds: [] }),

  // ── Registration ────────────────────────────────────────────────────────────
  registerPart: (id, basePos) =>
    set(s => ({
      registeredIds: new Set([...s.registeredIds, id]),
      basePosMap: { ...s.basePosMap, [id]: basePos },
    })),

  unregisterPart: (id) =>
    set(s => {
      const ids = new Set(s.registeredIds)
      ids.delete(id)
      const basePosMap = { ...s.basePosMap }
      delete basePosMap[id]
      return { registeredIds: ids, basePosMap }
    }),

  // ── Offset editing ─────────────────────────────────────────────────────────
  setField: (id, field, rawVal) => {
    const val = Number(rawVal) || 0
    set(s => ({
      offsets: {
        ...s.offsets,
        [id]: { ...ZERO, ...(s.offsets[id] || {}), [field]: val },
      },
    }))
  },

  step: (id, field, delta) => {
    const cur = (get().offsets[id] || ZERO)[field] || 0
    const next = Math.round((cur + delta) * 100) / 100
    set(s => ({
      offsets: {
        ...s.offsets,
        [id]: { ...ZERO, ...(s.offsets[id] || {}), [field]: next },
      },
    }))
  },

  resetPart: (id) =>
    set(s => {
      const next = { ...s.offsets }
      delete next[id]
      return { offsets: next }
    }),

  applyToSameType: (id) => {
    const state = get()
    const type = id.replace(/_[^_]+$/, '')
    const current = { ...ZERO, ...(state.offsets[id] || {}) }
    const newOffsets = { ...state.offsets }
    state.registeredIds.forEach(key => {
      if (key !== id && key.startsWith(type + '_')) newOffsets[key] = { ...current }
    })
    set({ offsets: newOffsets })
  },

  // ── Alignment ──────────────────────────────────────────────────────────────
  // axis: 'x' | 'y' | 'z'
  // mode: 'min' (좌/하/앞) | 'center' (중앙) | 'max' (우/상/뒤)
  align: (axis, mode) => {
    const s = get()
    const ids = s.selectedIds
    if (ids.length < 2) return

    const axisKey = { x: 'dx', y: 'dy', z: 'dz' }[axis]

    // Effective position = base natural position + current dev offset (all in mm)
    const positions = ids.map(id => {
      const base = s.basePosMap[id]?.[axis] ?? 0
      const off = (s.offsets[id] ?? ZERO)[axisKey] ?? 0
      return base + off
    })

    const minP = Math.min(...positions)
    const maxP = Math.max(...positions)
    const target = mode === 'min' ? minP
      : mode === 'max' ? maxP
      : (minP + maxP) / 2

    const newOffsets = { ...s.offsets }
    ids.forEach(id => {
      const base = s.basePosMap[id]?.[axis] ?? 0
      const cur = { ...ZERO, ...(s.offsets[id] || {}) }
      newOffsets[id] = { ...cur, [axisKey]: Math.round((target - base) * 100) / 100 }
    })

    set({ offsets: newOffsets })
  },

  // ── Persistence ────────────────────────────────────────────────────────────
  saveToFile: async () => {
    const { offsets } = get()
    const cleaned = Object.fromEntries(
      Object.entries(offsets).filter(([, v]) =>
        Object.values(v).some(n => n !== 0)
      )
    )
    try {
      const res = await fetch('/api/dev-save-offsets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned, null, 2),
      })
      return res.ok
    } catch {
      return false
    }
  },

  copyJSON: () => {
    navigator.clipboard?.writeText(JSON.stringify(get().offsets, null, 2))
  },
}))

export default useDevStore
