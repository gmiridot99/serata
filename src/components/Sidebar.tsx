'use client'

import type { EventCategory } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/categories'

const DATE_OPTIONS = [
  { key: 'today',    label: 'stasera' },
  { key: 'tomorrow', label: 'domani' },
  { key: 'weekend',  label: 'questo weekend' },
]

const CATS = (Object.keys(CATEGORY_COLORS) as EventCategory[]).map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  color: CATEGORY_COLORS[key],
}))

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

type Props = {
  cityName?: string
  radiusKm?: number
  activeDate?: string
  onDateChange: (date: string | undefined) => void
  activeCategories?: EventCategory[]
  onCategoryChange: (cats: EventCategory[]) => void
  onCityClick: () => void
  eventCounts?: Record<string, number>
  free?: boolean
  onFreeChange?: (free: boolean) => void
}

export default function Sidebar({
  cityName = 'Milano',
  radiusKm = 10,
  activeDate,
  onDateChange,
  activeCategories = [],
  onCategoryChange,
  onCityClick,
  eventCounts = {},
  free = false,
  onFreeChange,
}: Props) {
  function toggleCat(key: EventCategory) {
    const next = activeCategories.includes(key)
      ? activeCategories.filter((k) => k !== key)
      : [...activeCategories, key]
    onCategoryChange(next)
  }

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 border-r border-border flex-col gap-[22px] p-[22px] overflow-y-auto">
      <span className="font-display font-black text-2xl text-accent">serata</span>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">città</p>
        <button onClick={onCityClick} className="flex items-center justify-between w-full">
          <span className="font-display text-[22px] text-text font-bold">{cityName}</span>
          <ChevronIcon />
        </button>
        <p className="text-[11px] text-muted mt-0.5">raggio {radiusKm}km</p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">quando</p>
        <div className="flex flex-col gap-0.5">
          {DATE_OPTIONS.map((opt) => {
            const active = activeDate === opt.key
            const count = eventCounts[opt.key]
            return (
              <button
                key={opt.key}
                onClick={() => onDateChange(activeDate === opt.key ? undefined : opt.key)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                  active ? 'bg-accent-lo text-accent' : 'text-bright hover:text-text hover:bg-elev'
                }`}
              >
                <span>{opt.label}</span>
                {count != null && (
                  <span className={`text-[11px] tabular-nums ${active ? 'text-accent' : 'text-muted'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">cosa</p>
        <div className="flex flex-col gap-0.5">
          {CATS.map((cat) => {
            const active = activeCategories.includes(cat.key)
            return (
              <button
                key={cat.key}
                onClick={() => toggleCat(cat.key)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left"
                style={{
                  background: active ? cat.color + '22' : 'transparent',
                  color: active ? cat.color : 'var(--bright)',
                }}
              >
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: cat.color }} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">prezzo</p>
        <div className="flex gap-2">
          {(['tutti', 'gratis'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onFreeChange?.(opt === 'gratis')}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                (opt === 'gratis') === free
                  ? 'bg-accent-lo border-accent text-accent'
                  : 'border-border text-bright hover:text-text'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
