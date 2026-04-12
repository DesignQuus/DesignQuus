import { useMemo, useState, useRef, useCallback } from 'react'
import useDevStore, { ZERO } from '../../store/useDevStore.js'
import useShelfStore from '../../store/useShelfStore.js'
import { getEffBbox, computeGaps } from './DevMeasure.jsx'

const AXIS_COLOR = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' }

const TRANS_FIELDS = [
  { key: 'dx', label: 'X', step: 0.1, axis: 'x' },
  { key: 'dy', label: 'Y', step: 0.1, axis: 'y' },
  { key: 'dz', label: 'Z', step: 0.1, axis: 'z' },
]
const ROT_FIELDS = [
  { key: 'rx', label: 'Rx', step: 1, axis: 'x' },
  { key: 'ry', label: 'Ry', step: 1, axis: 'y' },
  { key: 'rz', label: 'Rz', step: 1, axis: 'z' },
]

// Alignment grid: axis × mode
const ALIGN_AXES = [
  { axis: 'x', label: 'X', minLabel: '←', centerLabel: '↔', maxLabel: '→' },
  { axis: 'y', label: 'Y', minLabel: '↓', centerLabel: '↕', maxLabel: '↑' },
  { axis: 'z', label: 'Z', minLabel: '앞', centerLabel: '⇔', maxLabel: '뒤' },
]

const PANEL_W = 210

export default function DevPanel({ screenshotRef, cameraRef }) {
  const selectedCount = useDevStore(s => s.selectedIds.length)
  // Derive primaryId directly from store — avoids stale closure in callbacks
  const primaryId = useDevStore(s => s.selectedIds[s.selectedIds.length - 1] ?? null)

  const storedOffset = useDevStore(s => {
    const id = s.selectedIds[s.selectedIds.length - 1]
    return id ? s.offsets[id] : null
  })
  const cur = useMemo(
    () => (storedOffset ? { ...ZERO, ...storedOffset } : { ...ZERO }),
    [storedOffset]
  )

  const setField = useDevStore(s => s.setField)
  const stepFn = useDevStore(s => s.step)
  const resetPart = useDevStore(s => s.resetPart)
  const applyToSameType = useDevStore(s => s.applyToSameType)
  const saveToFile = useDevStore(s => s.saveToFile)
  const copyJSON = useDevStore(s => s.copyJSON)
  const clear = useDevStore(s => s.clear)
  const align = useDevStore(s => s.align)
  const showOverallDims = useDevStore(s => s.showOverallDims)
  const toggleOverallDims = useDevStore(s => s.toggleOverallDims)
  const showSpacingDims = useDevStore(s => s.showSpacingDims)
  const toggleSpacingDims = useDevStore(s => s.toggleSpacingDims)

  const type = primaryId ? primaryId.replace(/_[^_]+$/, '') : ''

  // ── Shelf unit position (useShelfStore) ──────────────────────────────────────
  const shelves = useShelfStore(s => s.shelves)
  const setShelfOffset = useShelfStore(s => s.setShelfOffset)

  const alignShelvesZ = useCallback((mode) => {
    // front edge world Z = offsetZ (depth-independent because group z = depth/200 + offsetZ/100)
    if (mode === 'back') {
      // align all back faces to Z=0 (default): reset offsetZ = 0
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, 0))
    } else if (mode === 'front') {
      // align all front faces at the same Z — use the max front edge
      const frontZs = shelves.map(s => (s.depth) + (s.offsetZ || 0))
      const target = Math.max(...frontZs)
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, target - s.depth))
    } else if (mode === 'center') {
      const centerZs = shelves.map(s => (s.offsetZ || 0))
      const avg = centerZs.reduce((a, b) => a + b, 0) / centerZs.length
      shelves.forEach(s => setShelfOffset(s.id, s.offsetX || 0, avg))
    }
  }, [shelves, setShelfOffset])

  const resetAllShelfOffsets = useCallback(() => {
    shelves.forEach(s => setShelfOffset(s.id, 0, 0))
  }, [shelves, setShelfOffset])

  // ── Edge-to-edge measurements (2 selected) ──────────────────────────────────
  // Use primitive selectors so Zustand can do stable reference comparison.
  // A selector that returns a new object on every call causes infinite re-renders
  // in Zustand v5 because the component always appears "changed".
  const selectedIdsStr = useDevStore(s => s.selectedIds.join(','))
  const basePosMap = useDevStore(s => s.basePosMap)
  const bboxRelMap = useDevStore(s => s.bboxRelMap)
  const offsets = useDevStore(s => s.offsets)

  const gaps = useMemo(() => {
    const ids = selectedIdsStr.split(',').filter(Boolean)
    if (ids.length !== 2) return null
    const bA = getEffBbox(ids[0], basePosMap, bboxRelMap, offsets)
    const bB = getEffBbox(ids[1], basePosMap, bboxRelMap, offsets)
    if (!bA || !bB) return null
    return computeGaps(bA, bB)
  }, [selectedIdsStr, basePosMap, bboxRelMap, offsets])

  // ── Drag state ──────────────────────────────────────────
  const [pos, setPos] = useState({ x: 14, y: 70 })
  const dragRef = useRef(null) // { startX, startY, origX, origY }

  const onHeaderPointerDown = useCallback((e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    }
  }, [pos])

  const onHeaderPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const nx = Math.max(0, Math.min(window.innerWidth - PANEL_W - 4, dragRef.current.origX + dx))
    const ny = Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy))
    setPos({ x: nx, y: ny })
  }, [])

  const onHeaderPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])
  // ────────────────────────────────────────────────────────

  const handleSave = async () => {
    const ok = await saveToFile()
    alert(ok ? '✅ partOffsets.json 저장 완료' : '❌ 저장 실패 (Vite dev 서버 확인)')
  }


  return (
    <div style={{ ...panelStyle, left: pos.x, top: pos.y }}>
      {/* Draggable header */}
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        style={headerStyle}
      >
        <span style={{ color: '#f97316', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
          DEV MODE
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selectedCount >= 2 && (
            <span style={{ color: '#7dd3fc', fontSize: 10 }}>{selectedCount}개 선택</span>
          )}
          <span style={{ color: '#555', fontSize: 10 }}>?dev=1</span>
          <span style={{ color: '#555', fontSize: 14, lineHeight: 1, cursor: 'grab' }}>⠿</span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ overflowY: 'auto', flex: 1, paddingTop: 4 }}>

      {/* ── 선반 유닛 위치 (Shelf Unit Positions) ── */}
      {shelves.length > 0 && (
        <div style={{ marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={sectionLabel}>선반 유닛 위치</span>
            <button
              onClick={resetAllShelfOffsets}
              style={{ ...smallBtn, fontSize: 9, padding: '1px 7px', color: '#fca5a5', borderColor: 'rgba(252,165,165,0.3)' }}
              title="모든 선반 오프셋을 0으로 초기화"
            >전체 초기화</button>
          </div>

          {shelves.map(shelf => (
            <div key={shelf.id} style={{ marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '5px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#f97316', fontSize: 10, fontWeight: 700 }}>{shelf.label}</span>
                <button
                  onClick={() => setShelfOffset(shelf.id, 0, 0)}
                  style={{ ...smallBtn, fontSize: 9, padding: '0px 5px', color: '#fca5a5', borderColor: 'rgba(252,165,165,0.25)' }}
                >리셋</button>
              </div>
              <ShelfOffsetRow
                label="X" color={AXIS_COLOR.x}
                value={shelf.offsetX || 0}
                onStep={delta => setShelfOffset(shelf.id, Math.round(((shelf.offsetX||0) + delta) * 10)/10, shelf.offsetZ || 0)}
                onChange={v => setShelfOffset(shelf.id, v, shelf.offsetZ || 0)}
              />
              <ShelfOffsetRow
                label="Z" color={AXIS_COLOR.z}
                value={shelf.offsetZ || 0}
                onStep={delta => setShelfOffset(shelf.id, shelf.offsetX || 0, Math.round(((shelf.offsetZ||0) + delta) * 10)/10)}
                onChange={v => setShelfOffset(shelf.id, shelf.offsetX || 0, v)}
              />
            </div>
          ))}

          {/* Z-axis (depth) alignment */}
          {shelves.length > 1 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ ...sectionLabel, display: 'block', marginBottom: 3 }}>깊이 정렬 (Z)</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[
                  { mode: 'back',   label: '뒷면', title: '모든 선반 뒷면을 Z=0에 정렬' },
                  { mode: 'center', label: '중앙', title: '모든 선반 Z오프셋을 평균값으로 맞춤' },
                  { mode: 'front',  label: '앞면', title: '모든 선반 앞면을 같은 Z에 정렬' },
                ].map(({ mode, label, title }) => (
                  <button key={mode} onClick={() => alignShelvesZ(mode)} title={title}
                    style={{ ...alignBtn, flex: 1, fontSize: 10 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Multi-select alignment grid ── */}
      {selectedCount >= 2 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={sectionLabel}>정렬 ({selectedCount}개 선택)</span>
            <button
              onClick={clear}
              style={{ ...smallBtn, color: '#fca5a5', borderColor: 'rgba(252,165,165,0.3)', fontSize: 10, padding: '1px 8px' }}
            >
              선택 해제
            </button>
          </div>
          {ALIGN_AXES.map(({ axis, label, minLabel, centerLabel, maxLabel }) => {
            const c = AXIS_COLOR[axis]
            const btn = {
              ...alignBtn,
              background: `${c}22`,
              border: `1px solid ${c}55`,
              color: c,
            }
            return (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                <span style={{ color: c, fontSize: 11, fontWeight: 700, width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {label}
                </span>
                <button onClick={() => align(axis, 'min')} style={btn} title={`${axis}축 최솟값 정렬`}>
                  {minLabel}
                </button>
                <button onClick={() => align(axis, 'center')} style={btn} title={`${axis}축 중앙 정렬`}>
                  {centerLabel}
                </button>
                <button onClick={() => align(axis, 'max')} style={btn} title={`${axis}축 최댓값 정렬`}>
                  {maxLabel}
                </button>
              </div>
            )
          })}
          {/* Edge-to-edge measurement table */}
          {gaps && (
            <div style={{ marginTop: 6, borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[['x','#ef4444'],['y','#22c55e'],['z','#3b82f6']].map(([ax, c]) => (
                <div key={ax} style={{ display: 'flex', alignItems: 'center', gap: 0, background: `${c}0d` }}>
                  <span style={{ color: c, fontWeight: 700, fontSize: 10, width: 28, textAlign: 'center', flexShrink: 0, borderRight: `1px solid ${c}33` }}>
                    {ax.toUpperCase()}
                  </span>
                  <span style={{ color: gaps[ax] < 0 ? '#f59e0b' : '#e2e8f0', fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', flex: 1 }}>
                    {gaps[ax] < 0
                      ? `겹침 ${Math.abs(gaps[ax])} mm`
                      : `${gaps[ax]} mm`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, marginBottom: 6 }} />
          <div style={{ color: '#9ca3af', fontSize: 10, marginBottom: 4 }}>
            개별 조절: {primaryId ?? '—'}
          </div>
        </div>
      )}

      {/* ── No selection ── */}
      {selectedCount === 0 ? (
        <div style={{ color: '#777', fontSize: 11, marginBottom: 10 }}>
          부품을 클릭하여 선택하세요
        </div>
      ) : (
        <>
          {selectedCount === 1 && (
            <div style={{ color: '#93c5fd', fontSize: 11, fontFamily: 'monospace', marginBottom: 8, background: 'rgba(255,255,255,0.06)', padding: '4px 6px', borderRadius: 4 }}>
              {primaryId}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={sectionLabel}>위치 (mm)</span>
            <span style={{ color: '#6b7280', fontSize: 9 }}>Shift=10  Alt+Shift=1</span>
          </div>
          {TRANS_FIELDS.map(({ key, label, step, axis }) => (
            <FieldRow
              key={key}
              label={label}
              color={AXIS_COLOR[axis]}
              value={cur[key]}
              step={step}
              shiftStep={10}
              altShiftStep={1}
              onStep={(delta) => { const id = useDevStore.getState().selectedIds.at(-1); if (id) stepFn(id, key, delta) }}
              onChange={v => { const id = useDevStore.getState().selectedIds.at(-1); if (id) setField(id, key, v) }}
            />
          ))}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8, marginBottom: 4 }}>
            <span style={sectionLabel}>회전 (°)</span>
            <span style={{ color: '#6b7280', fontSize: 9 }}>Shift=10°  Alt+Shift=5°</span>
          </div>
          {ROT_FIELDS.map(({ key, label, step, axis }) => (
            <FieldRow
              key={key}
              label={label}
              color={AXIS_COLOR[axis]}
              value={cur[key]}
              step={step}
              shiftStep={10}
              altShiftStep={5}
              onStep={(delta) => { const id = useDevStore.getState().selectedIds.at(-1); if (id) stepFn(id, key, delta) }}
              onChange={v => { const id = useDevStore.getState().selectedIds.at(-1); if (id) setField(id, key, v) }}
            />
          ))}

          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            <Btn color="#7f1d1d" onClick={() => { const id = useDevStore.getState().selectedIds.at(-1); if (id) resetPart(id) }}>리셋</Btn>
            <Btn color="#1e3a5f" onClick={() => { const id = useDevStore.getState().selectedIds.at(-1); if (id) applyToSameType(id) }}>
              {type} 모두
            </Btn>
            <Btn color="#374151" onClick={clear}>해제</Btn>
          </div>
        </>
      )}

      </div>{/* end scrollable body */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, flexShrink: 0 }}>
        <button
          onClick={toggleOverallDims}
          style={toggleBtnStyle(showOverallDims)}
          title="전체 W/H/D 치수선"
        >
          {showOverallDims ? '전체치수 ●' : '전체치수 ○'}
        </button>
        <button
          onClick={toggleSpacingDims}
          style={toggleBtnStyle(showSpacingDims)}
          title="선반 간격 치수"
        >
          {showSpacingDims ? '간격치수 ●' : '간격치수 ○'}
        </button>
        <Btn color="#374151" onClick={copyJSON}>JSON 복사</Btn>
        <Btn color="#166534" onClick={handleSave}>파일 저장</Btn>
      </div>
    </div>
  )
}

// Simple ±1mm row for shelf unit offsets
function ShelfOffsetRow({ label, color, value, onStep, onChange }) {
  const [draft, setDraft] = useState(null)
  const commit = (raw) => {
    const num = parseFloat(raw)
    if (!isNaN(num)) onChange(Math.round(num * 10) / 10)
    setDraft(null)
  }
  const btnStyle = { ...smallBtn, color, borderColor: `${color}55`, background: `${color}18` }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2, borderLeft: `2px solid ${color}`, paddingLeft: 4 }}>
      <span style={{ color, fontSize: 10, fontWeight: 700, width: 14, flexShrink: 0 }}>{label}</span>
      <button onClick={e => onStep(e.shiftKey ? -10 : -1)} style={btnStyle}>−</button>
      <input
        type="text" inputMode="decimal"
        value={draft !== null ? draft : String(value)}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => { setDraft(String(value)); e.target.select() }}
        onBlur={() => commit(draft ?? String(value))}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(draft ?? String(value)); e.target.blur() }
          if (e.key === 'Escape') { setDraft(null); e.target.blur() }
        }}
        style={{ ...inputStyle, borderColor: `${color}44`, width: 52 }}
      />
      <span style={{ color: '#6b7280', fontSize: 9, flex: 1 }}>mm</span>
      <button onClick={e => onStep(e.shiftKey ? 10 : 1)} style={btnStyle}>+</button>
    </div>
  )
}

function FieldRow({ label, color = '#9ca3af', value, step, shiftStep, altShiftStep, onStep, onChange }) {
  // draft !== null → user is actively editing; hold raw string so "12." or "-5" don't snap
  const [draft, setDraft] = useState(null)

  const commit = (raw) => {
    const num = parseFloat(raw)
    if (!isNaN(num)) onChange(num)
    setDraft(null)
  }

  const handleFocus = (e) => {
    setDraft(String(value))
    e.target.select()
  }

  const handleChange = (e) => setDraft(e.target.value)

  const handleBlur = () => commit(draft ?? String(value))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { commit(draft ?? String(value)); e.target.blur() }
    if (e.key === 'Escape') { setDraft(null); e.target.blur() }
  }

  const getStep = (e) => {
    if (e.shiftKey && e.altKey) return altShiftStep ?? step
    if (e.shiftKey) return shiftStep ?? step
    return step
  }

  const btnStyle = {
    ...smallBtn,
    color,
    borderColor: `${color}55`,
    background: `${color}18`,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3, borderLeft: `2px solid ${color}`, paddingLeft: 4 }}>
      <span style={{ color, fontSize: 11, fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </span>
      <button
        onClick={e => onStep(-getStep(e))}
        style={btnStyle}
        title={`±${step} / Shift:±${shiftStep ?? step} / Alt+Shift:±${altShiftStep ?? step}`}
      >−</button>
      <input
        type="text"
        inputMode="decimal"
        value={draft !== null ? draft : String(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{ ...inputStyle, borderColor: `${color}44` }}
      />
      <button
        onClick={e => onStep(getStep(e))}
        style={btnStyle}
        title={`±${step} / Shift:±${shiftStep ?? step} / Alt+Shift:±${altShiftStep ?? step}`}
      >+</button>
    </div>
  )
}

function Btn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        border: 'none',
        borderRadius: 4,
        color: '#fff',
        fontSize: 10,
        cursor: 'pointer',
        padding: '4px 8px',
        fontWeight: 600,
        lineHeight: 1.4,
        width: '100%',
      }}
    >
      {children}
    </button>
  )
}

function toggleBtnStyle(active) {
  return {
    background: active ? '#1e3a5f' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.14)'}`,
    borderRadius: 4,
    color: active ? '#93c5fd' : '#6b7280',
    fontSize: 10,
    cursor: 'pointer',
    padding: '4px 6px',
    fontWeight: 600,
    lineHeight: 1.4,
    width: '100%',
  }
}

const panelStyle = {
  position: 'fixed',
  background: 'rgba(8, 12, 24, 0.93)',
  border: '1px solid rgba(249, 115, 22, 0.5)',
  borderRadius: 10,
  padding: '0 12px 10px',
  width: PANEL_W,
  maxHeight: 'calc(100vh - 24px)',
  display: 'flex',
  flexDirection: 'column',
  backdropFilter: 'blur(12px)',
  zIndex: 2000,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
  userSelect: 'none',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0 8px',
  marginBottom: 2,
  cursor: 'grab',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  marginLeft: -12,
  marginRight: -12,
  paddingLeft: 12,
  paddingRight: 12,
}

const sectionLabel = {
  color: '#6b7280',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 4,
}

const inputStyle = {
  width: 58,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 4,
  color: '#f0f0f0',
  fontSize: 11,
  padding: '2px 4px',
  textAlign: 'right',
  outline: 'none',
}

const smallBtn = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 4,
  color: '#ccc',
  fontSize: 13,
  cursor: 'pointer',
  padding: '1px 6px',
  lineHeight: 1.4,
  flexShrink: 0,
}

const alignBtn = {
  background: 'rgba(96,165,250,0.15)',
  border: '1px solid rgba(96,165,250,0.3)',
  borderRadius: 4,
  color: '#7dd3fc',
  fontSize: 12,
  cursor: 'pointer',
  padding: '2px 8px',
  lineHeight: 1.4,
  flex: 1,
  textAlign: 'center',
}
