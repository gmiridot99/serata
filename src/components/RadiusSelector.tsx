const RADII = [5, 10, 25, 50] as const

type Props = {
  value: number
  onChange: (km: number) => void
}

export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {RADII.map((km) => (
        <button
          key={km}
          onClick={() => onChange(km)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === km
              ? 'bg-accent text-white'
              : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
          }`}
        >
          {km} km
        </button>
      ))}
    </div>
  )
}
