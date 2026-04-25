'use client'

type Filters = {
  date?: 'today' | 'weekend'
  q?: string     // keyword (imposta anche la scorciatoia attiva)
  free: boolean
}

type Props = {
  activeFilters: Filters
  onChange: (filters: Filters) => void
}

type DatePill = { label: string; kind: 'date'; value: 'today' | 'weekend' }
type FreePill = { label: string; kind: 'free' }
type KeywordPill = { label: string; kind: 'keyword'; value: string }
type PillConfig = DatePill | FreePill | KeywordPill

const DATE_PILLS: DatePill[] = [
  { label: 'Stasera', kind: 'date', value: 'today' },
  { label: 'Weekend', kind: 'date', value: 'weekend' },
]

const FREE_PILL: FreePill = { label: 'Gratis', kind: 'free' }

const KEYWORD_PILLS: KeywordPill[] = [
  { label: 'Discoteche', kind: 'keyword', value: 'discoteca nightclub' },
  { label: 'Bar & Aperitivo', kind: 'keyword', value: 'aperitivo bar' },
  { label: 'Live Music', kind: 'keyword', value: 'live music concerto' },
  { label: 'Teatro', kind: 'keyword', value: 'teatro' },
  { label: 'Cocktail Bar', kind: 'keyword', value: 'cocktail bar' },
  { label: 'Jazz', kind: 'keyword', value: 'jazz bar' },
]

const ALL_PILLS: PillConfig[] = [...DATE_PILLS, FREE_PILL, ...KEYWORD_PILLS]

export default function FilterBar({ activeFilters, onChange }: Props) {
  function isActive(pill: PillConfig): boolean {
    if (pill.kind === 'date') return activeFilters.date === pill.value
    if (pill.kind === 'free') return activeFilters.free
    return activeFilters.q === pill.value
  }

  function handleToggle(pill: PillConfig) {
    if (pill.kind === 'date') {
      onChange({
        ...activeFilters,
        date: activeFilters.date === pill.value ? undefined : pill.value,
      })
    } else if (pill.kind === 'free') {
      onChange({ ...activeFilters, free: !activeFilters.free })
    } else {
      // keyword shortcut: toggle on/off
      onChange({
        ...activeFilters,
        q: activeFilters.q === pill.value ? '' : pill.value,
      })
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {ALL_PILLS.map((pill) => (
        <button
          key={pill.label}
          onClick={() => handleToggle(pill)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isActive(pill)
              ? 'bg-accent text-white'
              : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}
