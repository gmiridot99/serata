'use client'

import { EventCategory } from '@/lib/types'

type Filters = {
  date?: 'today' | 'weekend'
  categories: EventCategory[]
  free: boolean
}

type Props = {
  activeFilters: Filters
  onChange: (filters: Filters) => void
}

type PillConfig =
  | { label: string; type: 'date'; value: 'today' | 'weekend' }
  | { label: string; type: 'free' }
  | { label: string; type: 'category'; value: EventCategory }

const PILLS: PillConfig[] = [
  { label: 'Stasera', type: 'date', value: 'today' },
  { label: 'Weekend', type: 'date', value: 'weekend' },
  { label: 'Gratis', type: 'free' },
  { label: 'Club', type: 'category', value: 'club' },
  { label: 'Concerti', type: 'category', value: 'concert' },
  { label: 'Teatro', type: 'category', value: 'theatre' },
  { label: 'Aperitivo', type: 'category', value: 'aperitivo' },
]

export default function FilterBar({ activeFilters, onChange }: Props) {
  function isActive(pill: PillConfig): boolean {
    if (pill.type === 'date') return activeFilters.date === pill.value
    if (pill.type === 'free') return activeFilters.free
    return activeFilters.categories.includes(pill.value)
  }

  function handleToggle(pill: PillConfig) {
    if (pill.type === 'date') {
      onChange({
        ...activeFilters,
        date: activeFilters.date === pill.value ? undefined : pill.value,
      })
    } else if (pill.type === 'free') {
      onChange({ ...activeFilters, free: !activeFilters.free })
    } else {
      const has = activeFilters.categories.includes(pill.value)
      onChange({
        ...activeFilters,
        categories: has
          ? activeFilters.categories.filter((c) => c !== pill.value)
          : [...activeFilters.categories, pill.value],
      })
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {PILLS.map((pill) => (
        <button
          key={pill.label}
          onClick={() => handleToggle(pill)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isActive(pill)
              ? 'bg-accent text-white'
              : 'bg-bg-card text-text-muted border border-white/10'
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}
