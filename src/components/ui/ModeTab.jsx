import useShelfStore from '../../store/useShelfStore.js'

const TABS = [
  { id: 'shelf',    label: '선반 시리즈' },
  { id: 'washer',   label: '세탁기선반' },
  { id: 'dressroom',label: '드레스룸' },
  { id: 'aquarium', label: '축양장' },
]

export default function ModeTab() {
  const { mode, setMode } = useShelfStore()

  return (
    <div className="fixed top-0 left-0 right-0 z-20 flex justify-center pt-2 px-2">
      <div className="flex gap-1 bg-black/40 backdrop-blur-sm rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`mode-tab px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${mode === tab.id
                ? 'active bg-white/25 text-white shadow-inner'
                : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
