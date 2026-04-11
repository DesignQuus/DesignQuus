import { create } from 'zustand'
import savedOffsets from '../config/partOffsets.json'

// Static constant — set once from URL, never changes
export const isDev = new URLSearchParams(window.location.search).get('dev') === '1'

export const ZERO = { dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0 }

const useDevStore = create((set, get) => ({
  selectedId: null,
  offsets: { ...savedOffsets },
  registeredIds: new Set(),

  select: (id) => set({ selectedId: id }),
  clear: () => set({ selectedId: null }),

  registerPart: (id) =>
    set(s => ({ registeredIds: new Set([...s.registeredIds, id]) })),

  unregisterPart: (id) =>
    set(s => {
      const ids = new Set(s.registeredIds)
      ids.delete(id)
      return { registeredIds: ids }
    }),

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
    // "AnglePost_0" → "AnglePost",  "ShelfBoard_bottom" → "ShelfBoard"
    const type = id.replace(/_[^_]+$/, '')
    const current = { ...ZERO, ...(state.offsets[id] || {}) }
    const newOffsets = { ...state.offsets }
    state.registeredIds.forEach(key => {
      if (key !== id && key.startsWith(type + '_')) {
        newOffsets[key] = { ...current }
      }
    })
    set({ offsets: newOffsets })
  },

  saveToFile: async () => {
    const { offsets } = get()
    // Only save non-zero entries
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
    const text = JSON.stringify(get().offsets, null, 2)
    navigator.clipboard?.writeText(text)
  },
}))

export default useDevStore
