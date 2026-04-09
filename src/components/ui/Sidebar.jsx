import useShelfStore from '../../store/useShelfStore.js'

const MODES = [
  { id: 'shelf',     icon: '🏠', label: '공간\n설정' },
  { id: 'washer',    icon: '🧺', label: '세탁기\n선반' },
  { id: 'dressroom', icon: '👗', label: '드레스\n룸' },
  { id: 'aquarium',  icon: '🐠', label: '축양장' },
]

const btn = (active) => ({
  width: 44, minHeight: 52,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 3, borderRadius: 8, marginBottom: 2,
  cursor: 'pointer', border: 'none',
  background: active ? '#F97316' : 'transparent',
  color: active ? '#fff' : '#9CA3AF',
})

export default function Sidebar({ onScreenshot }) {
  const { mode, setMode } = useShelfStore()

  return (
    <div style={{
      width: 56, flexShrink: 0, background: '#1C1C1C',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 0', zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{
        width: 36, height: 36, background: '#F97316', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, marginBottom: 12, flexShrink: 0,
      }}>🏗</div>

      {/* Mode buttons */}
      {MODES.map(item => (
        <button key={item.id} onClick={() => setMode(item.id)} style={btn(mode === item.id)}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontSize: 9, lineHeight: 1.3, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
            {item.label}
          </span>
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Screenshot */}
      <button onClick={onScreenshot} style={btn(false)}>
        <span style={{ fontSize: 18 }}>📷</span>
        <span style={{ fontSize: 9 }}>저장</span>
      </button>
    </div>
  )
}
