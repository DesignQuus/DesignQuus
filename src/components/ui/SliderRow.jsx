import { useState, useRef } from 'react'

// badge prop: 파생값 표시용 읽기 전용 (단/칸 수 등)
// 나머지는 숫자 입력 + 상하 꺽쇠 증감
export default function SliderRow({ label, value, min, max, step = 1, unit = 'mm', badge, onChange }) {
  const [draft, setDraft] = useState(null)

  // 항상 최신 value를 가리키는 ref — setInterval 클로저 stale 방지
  const valueRef = useRef(value)
  valueRef.current = value

  const commit = (raw) => {
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, Math.round(num / step) * step))
      onChange(clamped)
    }
    setDraft(null)
  }

  const inc = () => onChange(Math.min(max, Math.round((valueRef.current + step) / step) * step))
  const dec = () => onChange(Math.max(min, Math.round((valueRef.current - step) / step) * step))

  const repeatRef = useRef(null)

  // dir: +1 증가 / -1 감소
  // 첫 클릭: step 단위 이동, 350ms 이후 누르고 있으면: 1단위씩 80ms 반복
  const startRepeat = (dir) => {
    if (dir > 0) inc(); else dec()
    repeatRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => {
        // valueRef.current는 매 렌더마다 갱신되므로 항상 최신값
        const next = valueRef.current + dir
        onChange(Math.max(min, Math.min(max, next)))
      }, 80)
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
                onMouseDown={e => { e.preventDefault(); startRepeat(1) }}
                onMouseUp={stopRepeat}
                onMouseLeave={stopRepeat}
                onTouchStart={e => { e.preventDefault(); startRepeat(1) }}
                onTouchEnd={stopRepeat}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.65)', fontSize: 8, lineHeight: 1,
                  cursor: 'pointer', display: 'block', width: 14, textAlign: 'center',
                }}
              >▲</button>
              <button
                tabIndex={-1}
                onMouseDown={e => { e.preventDefault(); startRepeat(-1) }}
                onMouseUp={stopRepeat}
                onMouseLeave={stopRepeat}
                onTouchStart={e => { e.preventDefault(); startRepeat(-1) }}
                onTouchEnd={stopRepeat}
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

      {/* step={1} 로 thumb 를 1단위로 부드럽게 이동, onChange에서 step 단위로 snap */}
      <input
        type="range"
        min={min} max={max} step={1} value={value}
        onChange={e => {
          const snapped = Math.round(Number(e.target.value) / step) * step
          onChange(Math.max(min, Math.min(max, snapped)))
        }}
      />
    </div>
  )
}
