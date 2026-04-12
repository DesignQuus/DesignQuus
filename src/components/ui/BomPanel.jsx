import { useCallback, useMemo, useState } from 'react'
import useShelfStore from '../../store/useShelfStore.js'
import { calculateBOM } from '../../utils/bomCalculator.js'
import CameraPresetButtons from './CameraPresets.jsx'

// open/onToggle 을 전달하면 외부에서 제어(아코디언), 없으면 자체 상태로 동작
export default function BomPanel({ onCameraPreset, onDim, arActive, setArActive, onBomRef, open: openProp, onToggle }) {
  const { mode, width, height, depth, shelfCount, feetType } = useShelfStore()
  const [openInternal, setOpenInternal] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openInternal
  const handleToggle = isControlled ? onToggle : () => setOpenInternal(v => !v)

  const headerRef = useCallback(node => { onBomRef?.(node) }, [onBomRef])

  const bom = useMemo(
    () => calculateBOM({ mode, width, height, depth, shelfCount, feetType }),
    [mode, width, height, depth, shelfCount, feetType]
  )

  function handleCopy() {
    const text = bom.map(b => `${b.name} (${b.spec}) × ${b.qty}${b.unit}`).join('\n')
    navigator.clipboard?.writeText(text)
  }

  return (
    <div className="mt-3 border-t border-white/20 pt-3">
      <button
        ref={headerRef}
        onClick={handleToggle}
        className="w-full flex justify-between items-center text-xs font-semibold"
        style={{ color: '#f97316' }}
      >
        <span>부품 목록 (BOM)</span>
        <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
          <rect x="0" y="0"   width="14" height="1.8" rx="0.9"/>
          <rect x={open ? "2" : "0"} y="5.1" width={open ? "12" : "14"} height="1.8" rx="0.9"/>
          <rect x="0" y="10.2" width="14" height="1.8" rx="0.9"/>
        </svg>
      </button>

      {/* 아코디언 슬라이드 애니메이션 */}
      <div style={{ overflow: 'hidden', maxHeight: open ? '520px' : '0', transition: 'max-height 0.22s ease' }}>
        <div className="mt-2">
          <table className="bom-table w-full text-white/90">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-xs font-medium text-white/60">부품</th>
                <th className="text-left text-xs font-medium text-white/60">규격</th>
                <th className="text-right text-xs font-medium text-white/60">수량</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((item, i) => (
                <tr key={i} className="border-b border-white/10">
                  <td className="text-xs py-1">{item.name}</td>
                  <td className="text-xs py-1 text-white/70">{item.spec}</td>
                  <td className="text-xs py-1 text-right font-bold">{item.qty}{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-all"
            >
              목록 복사
            </button>
            <a
              href="https://dekiri.com"
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs rounded-lg text-center transition-all"
            >
              견적 문의
            </a>
          </div>

          {/* 카메라 프리셋 + 도면/AR 도구 */}
          {onCameraPreset && <CameraPresetButtons onPreset={onCameraPreset} />}

          {onDim && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onDim}
                className="flex-1 py-2 bg-orange-500/80 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition-all"
              >
                도면 작성
              </button>
              <button
                onClick={() => setArActive?.(v => !v)}
                className={`flex-1 py-2 text-white text-xs font-medium rounded-lg transition-all ${
                  arActive
                    ? 'bg-orange-500 hover:bg-orange-400'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                공간 시뮬레이션
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
