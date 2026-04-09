import useShelfStore from '../../store/useShelfStore.js'
import ShelfMode from '../modes/ShelfMode.jsx'
import WasherMode from '../modes/WasherMode.jsx'
import DressroomMode from '../modes/DressroomMode.jsx'
import AquariumMode from '../modes/AquariumMode.jsx'
import BomPanel from './BomPanel.jsx'
import CameraPresetButtons from './CameraPresets.jsx'

const MODE_PANELS = { shelf: ShelfMode, washer: WasherMode, dressroom: DressroomMode, aquarium: AquariumMode }
const MODE_TITLES = { shelf: '선반 시리즈', washer: '세탁기선반', dressroom: '드레스룸', aquarium: '축양장' }

export default function ConfigPanel({ onCameraPreset, onScreenshot, onArMode }) {
  const { mode, width, height, depth } = useShelfStore()
  const ModePanel = MODE_PANELS[mode] || ShelfMode

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: '#FFFFFF', borderRight: '1px solid #E5E7EB',
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14 }}>📐</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>{MODE_TITLES[mode]}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>치수를 설정하고 3D로 확인하세요</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <ModePanel />

        <div style={{ marginTop: 8, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <BomPanel />
        </div>

        <div style={{ marginTop: 8, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <CameraPresetButtons onPreset={onCameraPreset} />
        </div>

        <button onClick={onArMode} style={{
          width: '100%', marginTop: 10, padding: '9px',
          background: '#F97316', color: '#FFFFFF', border: 'none',
          borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          📷 공간 사진으로 시뮬레이션
        </button>
      </div>

      {/* Summary */}
      <div style={{
        background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
        padding: '10px 16px', display: 'flex', justifyContent: 'space-around',
      }}>
        {[['가로', width], ['세로', depth], ['높이', height]].map(([label, val]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#F97316' }}>{val}</div>
            <div style={{ fontSize: 10, color: '#6B7280' }}>{label} mm</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          onClick={() => window.open('https://dekiri.com', '_blank')}
          style={{
            width: '100%', padding: '13px',
            background: '#F97316', color: '#FFFFFF', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          다음: 제품 선택 →
        </button>
      </div>
    </div>
  )
}
