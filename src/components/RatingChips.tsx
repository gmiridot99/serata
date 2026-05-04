'use client'

const CHIPS: { label: string; value: number }[] = [
  { label: 'Tutti',  value: 0   },
  { label: '⭐ 3+', value: 3   },
  { label: '⭐ 4+', value: 4   },
  { label: '⭐ 4.5+', value: 4.5 },
]

type Props = {
  value: number
  onChange: (minRating: number) => void
  className?: string
}

export default function RatingChips({ value, onChange, className }: Props) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden${className ? ` ${className}` : ''}`}>
      {CHIPS.map((chip) => {
        const active = chip.value === value
        return (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className="shrink-0 px-3 py-1 rounded-full border text-[11px] font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'var(--accent)' : 'transparent',
              color:       active ? 'var(--bg)' : 'var(--bright)',
            }}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
