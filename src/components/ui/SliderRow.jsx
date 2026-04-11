import { useState, useRef } from 'react'

// badge prop: 파생값 표시용 읽기 전용 (단/칸 수 등)
// 나머지는 숫자 입력 + 상하 꺽쇠 증감
export default function SliderRow({ label, value, min, max, step = 1, unit = 'mm', badge, onChange }) {
  const [draft, setDraft] = useState(null)

  const commit = (raw) => {
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, Math.round(num / step) * step))
      onChange(clamped)
    }
    setDraft(null)
  }

  const inc = () => onChange(Math.min(max, value + step))
  const dec = () => onChange(Math.max(min, value - step))

  const repeatRef = useRef(null)
  const startRepeat = (fn) => {
    fn()
    repeatRef.current = setTimeout(() => {
      repeatRef.current = setInterval(fn, 80)
    }, 350)
  }
  const stopRepeat = () => {
    clearTimeout(repeatRef.current)
    clearInterval(repeatRef.current)
    repeatRef.current = null
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-white/90">{label}</span>

        {badge != null ? (
          // 파생값 뱃지 (단/칸 수) — 꺽쇠로 증감 가능
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12, height: 26, paddingLeft: 8, paddingRight: 4,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white', marginRight: 4 }}>
              {badge}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <button
                tabIndex={-1}
                onMouseDown={e => { e.preventDefault(); inc() }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1,
                  cursor: 'pointer', display: 'block', width: 14, textAlign: 'center',
                }}
              >▲</button>
              <button
                tabIndex={-1}
                onMouseDown={e => { e.preventDefault(); dec() }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1,
                  cursor: 'pointer', display: 'block', width: 14, textAlign: 'center',
                }}
              >▼</button>
            </div>
          </div>
        ) : (
          // 숫자 입력 + 상하 꺽쇠
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12, height: 26, paddingLeft: 8,
          }}>
            <input
              type="text"
              inputMode="numeric"
              value={draft !== null ? draft : value}
              onFocus={e => { setDraft(String(value)); e.target.select() }}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => commit(draft ?? String(value))}
              onKeyDown={e => {
                if (e.key === 'Enter')     { commit(draft ?? String(value)); e.target.blur() }
                if (e.key === 'Escape')    { setDraft(null); e.target.blur() }
                if (e.key === 'ArrowUp')   { e.preventDefault(); inc() }
                if (e.key === 'ArrowDown') { e.preventDefault(); dec() }
              }}
              style={{
                width: 38, background: 'transparent', border: 'none',
                color: 'white', fontSize: 11, fontWeight: 700,
                textAlign: 'right', outline: 'none', padding: 0,
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 4px 0 2px' }}>
              {unit}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 5, gap: 1 }}>
              <button
                tabIndex={-1}
                onMouseDown={e => { e.preventDefault(); startRepeat(inc) }}
                onMouseUp={stopRepeat}
                onMouseLeave={stopRepeat}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1,
                  cursor: 'pointer', display: 'block', width: 14, textAlign: 'center',
                }}
              >▲</button>
              <button
                tabIndex={-1}
                onMouseDown={e => { e.preventDefault(); startRepeat(dec) }}
                onMouseUp={stopRepeat}
                onMouseLeave={stopRepeat}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1,
                  cursor: 'pointer', display: 'block', width: 14, textAlign: 'center',
                }}
              >▼</button>
            </div>
          </div>
        )}
      </div>

      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}
