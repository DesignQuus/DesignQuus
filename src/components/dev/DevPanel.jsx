import useDevStore, { ZERO } from '../../store/useDevStore.js'

const TRANS_FIELDS = [
  { key: 'dx', label: 'X', unit: 'mm', step: 0.1 },
  { key: 'dy', label: 'Y', unit: 'mm', step: 0.1 },
  { key: 'dz', label: 'Z', unit: 'mm', step: 0.1 },
]
const ROT_FIELDS = [
  { key: 'rx', label: 'Rx', unit: '°', step: 1 },
  { key: 'ry', label: 'Ry', unit: '°', step: 1 },
  { key: 'rz', label: 'Rz', unit: '°', step: 1 },
]

export default function DevPanel() {
  const selectedId = useDevStore(s => s.selectedId)
  const offsets = useDevStore(s => s.offsets)
  const { setField, step, resetPart, applyToSameType, saveToFile, copyJSON, clear } =
    useDevStore.getState()

  const cur = { ...ZERO, ...(offsets[selectedId] || {}) }
  const type = selectedId ? selectedId.replace(/_[^_]+$/, '') : ''

  const handleSave = async () => {
    const ok = await saveToFile()
    alert(ok ? '✅ partOffsets.json 저장 완료' : '❌ 저장 실패 (Vite dev 서버 확인)')
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#f97316', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
          DEV MODE
        </span>
        <span style={{ color: '#666', fontSize: 10 }}>?dev=1</span>
      </div>

      {!selectedId ? (
        <div style={{ color: '#888', fontSize: 11, marginBottom: 10 }}>
          부품을 클릭하여 선택하세요
        </div>
      ) : (
        <>
          <div style={{ color: '#93c5fd', fontSize: 11, fontFamily: 'monospace', marginBottom: 8, background: 'rgba(255,255,255,0.06)', padding: '4px 6px', borderRadius: 4 }}>
            {selectedId}
          </div>

          {/* Position */}
          <div style={sectionLabel}>위치 (mm)</div>
          {TRANS_FIELDS.map(({ key, label, step: s }) => (
            <FieldRow
              key={key}
              label={label}
              value={cur[key]}
              step={s}
              onMinus={() => step(selectedId, key, -s)}
              onPlus={() => step(selectedId, key, s)}
              onChange={v => setField(selectedId, key, v)}
            />
          ))}

          {/* Rotation */}
          <div style={{ ...sectionLabel, marginTop: 8 }}>회전 (°)</div>
          {ROT_FIELDS.map(({ key, label, step: s }) => (
            <FieldRow
              key={key}
              label={label}
              value={cur[key]}
              step={s}
              onMinus={() => step(selectedId, key, -s)}
              onPlus={() => step(selectedId, key, s)}
              onChange={v => setField(selectedId, key, v)}
            />
          ))}

          {/* Part actions */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            <Btn color="#7f1d1d" onClick={() => resetPart(selectedId)}>리셋</Btn>
            <Btn color="#1e3a5f" onClick={() => applyToSameType(selectedId)}>
              {type} 모두 적용
            </Btn>
            <Btn color="#374151" onClick={clear}>선택 해제</Btn>
          </div>
        </>
      )}

      {/* Global actions */}
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
  left: 14,
  top: 70,
  background: 'rgba(8, 12, 24, 0.93)',
  border: '1px solid rgba(249, 115, 22, 0.5)',
  borderRadius: 10,
  padding: '10px 12px',
  width: 210,
  backdropFilter: 'blur(12px)',
  zIndex: 2000,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
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
