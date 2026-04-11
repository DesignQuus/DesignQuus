import { useMemo, useState, useRef, useCallback } from 'react'
import useDevStore, { ZERO } from '../../store/useDevStore.js'

const TRANS_FIELDS = [
  { key: 'dx', label: 'X', step: 0.1 },
  { key: 'dy', label: 'Y', step: 0.1 },
  { key: 'dz', label: 'Z', step: 0.1 },
]
const ROT_FIELDS = [
  { key: 'rx', label: 'Rx', step: 1 },
  { key: 'ry', label: 'Ry', step: 1 },
  { key: 'rz', label: 'Rz', step: 1 },
]

// Alignment grid: axis × mode
const ALIGN_AXES = [
  { axis: 'x', label: 'X축', minLabel: '←', centerLabel: '↔', maxLabel: '→' },
  { axis: 'y', label: 'Y축', minLabel: '↓', centerLabel: '↕', maxLabel: '↑' },
  { axis: 'z', label: 'Z축', minLabel: '앞', centerLabel: '⇔', maxLabel: '뒤' },
]

const PANEL_W = 210

export default function DevPanel() {
  const selectedCount = useDevStore(s => s.selectedIds.length)
  const primaryId = useDevStore(s => s.selectedIds[s.selectedIds.length - 1] ?? null)
  const selectedIds = useDevStore(s => s.selectedIds)

  const storedOffset = useDevStore(s => primaryId ? s.offsets[primaryId] : null)
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

  const type = primaryId ? primaryId.replace(/_[^_]+$/, '') : ''

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
          {ALIGN_AXES.map(({ axis, label, minLabel, centerLabel, maxLabel }) => (
            <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <span style={{ color: '#9ca3af', fontSize: 10, width: 28, textAlign: 'right', flexShrink: 0 }}>
                {label}
              </span>
              <button onClick={() => align(axis, 'min')} style={alignBtn} title={`${axis}축 최솟값 정렬`}>
                {minLabel}
              </button>
              <button onClick={() => align(axis, 'center')} style={alignBtn} title={`${axis}축 중앙 정렬`}>
                {centerLabel}
              </button>
              <button onClick={() => align(axis, 'max')} style={alignBtn} title={`${axis}축 최댓값 정렬`}>
                {maxLabel}
              </button>
            </div>
          ))}
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

          <div style={sectionLabel}>위치 (mm)</div>
          {TRANS_FIELDS.map(({ key, label, step }) => (
            <FieldRow
              key={key}
              label={label}
              value={cur[key]}
              step={step}
              onMinus={() => stepFn(primaryId, key, -step)}
              onPlus={() => stepFn(primaryId, key, step)}
              onChange={v => setField(primaryId, key, v)}
            />
          ))}

          <div style={{ ...sectionLabel, marginTop: 8 }}>회전 (°)</div>
          {ROT_FIELDS.map(({ key, label, step }) => (
            <FieldRow
              key={key}
              label={label}
              value={cur[key]}
              step={step}
              onMinus={() => stepFn(primaryId, key, -step)}
              onPlus={() => stepFn(primaryId, key, step)}
              onChange={v => setField(primaryId, key, v)}
            />
          ))}

          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            <Btn color="#7f1d1d" onClick={() => resetPart(primaryId)}>리셋</Btn>
            <Btn color="#1e3a5f" onClick={() => applyToSameType(primaryId)}>
              {type} 모두
            </Btn>
            <Btn color="#374151" onClick={clear}>해제</Btn>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <Btn color="#374151" onClick={copyJSON}>JSON 복사</Btn>
        <Btn color="#166534" onClick={handleSave}>파일 저장</Btn>
      </div>
    </div>
  )
}

function FieldRow({ label, value, step, onMinus, onPlus, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
      <span style={{ color: '#9ca3af', fontSize: 10, width: 22, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </span>
      <button onClick={onMinus} style={smallBtn}>−</button>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
      <button onClick={onPlus} style={smallBtn}>+</button>
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
      }}
    >
      {children}
    </button>
  )
}

const panelStyle = {
  position: 'fixed',
  background: 'rgba(8, 12, 24, 0.93)',
  border: '1px solid rgba(249, 115, 22, 0.5)',
  borderRadius: 10,
  padding: '0 12px 10px',
  width: PANEL_W,
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
