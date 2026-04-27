'use client'

type EventCategory = 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'

const CATS: { key: EventCategory; label: string; color: string }[] = [
  { key: 'club',      label: 'Club',      color: '#8b5cf6' },
  { key: 'concert',   label: 'Concerto',  color: '#3b82f6' },
  { key: 'aperitivo', label: 'Aperitivo', color: '#f97316' },
  { key: 'theatre',   label: 'Teatro',    color: '#10b981' },
]

type Props = {
  value?: EventCategory | EventCategory[]
  onChange: (value: EventCategory[]) => void
  className?: string
}

export default function CategoryChips({ value, onChange, className }: Props) {
  const selected: EventCategory[] = Array.isArray(value) ? value : value ? [value] : []

  function toggle(key: EventCategory) {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key]
    onChange(next)
  }

  return (
    <div className={`flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden${className ? ` ${className}` : ''}`}>
      {CATS.map((cat) => {
        const active = selected.includes(cat.key)
        return (
          <button
            key={cat.key}
            onClick={() => toggle(cat.key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium transition-all"
            style={{
              borderColor: active ? cat.color + '80' : 'var(--border)',
              background:  active ? cat.color + '18' : 'transparent',
              color:       active ? cat.color : 'var(--bright)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
