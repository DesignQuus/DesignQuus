// A single labeled slider row
// badge: custom display string for the value badge (overrides default "{value}{unit}")
export default function SliderRow({ label, value, min, max, step = 1, unit = 'mm', badge, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-white/90">{label}</span>
        <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
          {badge ?? `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
