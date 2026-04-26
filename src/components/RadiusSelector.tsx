type Props = {
  value: number
  onChange: (km: number) => void
}

export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-semibold text-accent w-12">
        {value} km
      </span>
      <input
        type="range"
        min={5}
        max={50}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 [accent-color:var(--accent)] cursor-pointer"
        aria-label="Raggio di ricerca"
      />
    </div>
  )
}
