import { useMemo, useState } from 'react'
import useShelfStore from '../../store/useShelfStore.js'
import { calculateBOM } from '../../utils/bomCalculator.js'

export default function BomPanel() {
  const { mode, width, height, depth, shelfCount, feetType } = useShelfStore()
  const [open, setOpen] = useState(false)

  const bom = useMemo(
    () => calculateBOM({ mode, width, height, depth, shelfCount, feetType }),
    [mode, width, height, depth, shelfCount, feetType]
  )

  function handleCopy() {
    const text = bom.map(b => `${b.name} (${b.spec}) × ${b.qty}${b.unit}`).join('\n')
    navigator.clipboard?.writeText(text)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, fontWeight: 600, color: '#1F2937', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}
      >
        <span>부품 목록 (BOM)</span>
        <span style={{ color: '#9CA3AF' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          <table className="bom-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9CA3AF', padding: '4px 0' }}>부품</th>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9CA3AF', padding: '4px 0' }}>규격</th>
                <th style={{ textAlign: 'right', fontSize: 11, fontWeight: 500, color: '#9CA3AF', padding: '4px 0' }}>수량</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ fontSize: 12, padding: '4px 0', color: '#1F2937' }}>{item.name}</td>
                  <td style={{ fontSize: 12, padding: '4px 0', color: '#6B7280' }}>{item.spec}</td>
                  <td style={{ fontSize: 12, padding: '4px 0', textAlign: 'right', fontWeight: 700, color: '#1F2937' }}>{item.qty}{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1, padding: '6px 0', background: '#F3F4F6', color: '#374151',
                fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer',
              }}
            >
              목록 복사
            </button>
            <a
              href="https://dekiri.com"
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1, padding: '6px 0', background: '#F97316', color: '#ffffff',
                fontSize: 12, borderRadius: 6, textAlign: 'center', textDecoration: 'none',
              }}
            >
              견적 문의
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
