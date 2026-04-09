// A single labeled slider row
export default function SliderRow({ label, value, min, max, step = 1, unit = 'mm', onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{label}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#ffffff',
          background: '#F97316', padding: '1px 8px', borderRadius: 9999,
        }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  )
}
