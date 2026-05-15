'use client'

import type { EventCategory } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/categories'

const CATS = (Object.keys(CATEGORY_COLORS) as EventCategory[]).map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  color: CATEGORY_COLORS[key],
}))

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
    <div className={`flex gap-1.5 overflow-x-auto no-scrollbar${className ? ` ${className}` : ''}`}>
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
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: cat.color }} />
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
