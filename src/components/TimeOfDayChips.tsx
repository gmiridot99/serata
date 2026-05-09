'use client'

import type { TimeOfDay } from '@/lib/types'

const SLOTS: { key: TimeOfDay; label: string; emoji: string }[] = [
  { key: 'afternoon', label: 'Pomeriggio',  emoji: '🌅' },
  { key: 'aperitivo', label: 'Aperitivo',   emoji: '🍹' },
  { key: 'dinner',    label: 'Cena',        emoji: '🍽' },
  { key: 'late',      label: 'Tarda sera',  emoji: '🌃' },
]

type Props = {
  value: TimeOfDay[]
  onChange: (value: TimeOfDay[]) => void
  className?: string
}

export default function TimeOfDayChips({ value, onChange, className }: Props) {
  function toggle(key: TimeOfDay) {
    const next = value.includes(key)
      ? value.filter(k => k !== key)
      : [...value, key]
    onChange(next)
  }

  return (
    <div className={`flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden${className ? ` ${className}` : ''}`}>
      {SLOTS.map(s => {
        const active = value.includes(s.key)
        return (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
