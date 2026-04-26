'use client'

import { useRef } from 'react'

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Pill = { label: string; sublabel: string; value: string }

function buildPills(): Pill[] {
  const now = new Date()
  const pills: Pill[] = []

  pills.push({
    label: 'Stasera',
    sublabel: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    value: 'today',
  })

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    pills.push({
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      sublabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      value: toLocalIsoDate(d),
    })
  }

  return pills
}

type Props = {
  value?: string
  onChange: (date: string | undefined) => void
}

export default function DateScroll({ value, onChange }: Props) {
  const pills = buildPills()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const isCustomDate =
    value !== undefined &&
    value !== 'today' &&
    !pills.some((p) => p.value === value)

  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.value
    if (!picked) return

    const todayIso = toLocalIsoDate(new Date())
    if (picked === todayIso) {
      onChange('today')
      return
    }

    const matchingPill = pills.find((p) => p.value === picked)
    if (matchingPill) {
      onChange(matchingPill.value)
      return
    }

    onChange(picked)
  }

  function formatCustomPill(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden items-start">
      {pills.map((pill) => {
        const active = value === pill.value
        return (
          <button
            key={pill.value}
            onClick={() => onChange(active ? undefined : pill.value)}
            className={`shrink-0 flex flex-col items-center px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            <span className="font-semibold">{pill.label}</span>
            <span className="opacity-70">{pill.sublabel}</span>
          </button>
        )
      })}

      {isCustomDate ? (
        <button
          onClick={() => onChange(undefined)}
          className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-accent text-white"
          aria-label="×"
        >
          <span>{formatCustomPill(value!)}</span>
          <span aria-hidden>×</span>
        </button>
      ) : (
        <button
          aria-label="calendario"
          onClick={() =>
            dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()
          }
          className="shrink-0 flex items-center justify-center px-3 py-1 rounded-xl bg-bg-card text-text-muted border border-white/10 hover:border-white/30"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      )}

      <input
        ref={dateInputRef}
        type="date"
        className="sr-only"
        tabIndex={-1}
        onChange={handleDateInputChange}
      />
    </div>
  )
}
