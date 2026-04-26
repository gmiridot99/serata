'use client'

import { useState, useEffect, useRef } from 'react'

const SHORTCUTS = [
  { label: 'Discoteche', value: 'discoteca nightclub' },
  { label: 'Bar & Aperitivo', value: 'aperitivo bar' },
  { label: 'Live Music', value: 'live music concerto' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Cocktail Bar', value: 'cocktail bar' },
  { label: 'Jazz', value: 'jazz bar' },
]

type Props = {
  value: string
  onChange: (q: string) => void
}

export default function VenueSearch({ value, onChange }: Props) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value) }, [value])

  function handleChange(v: string) {
    setLocal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 500)
  }

  function handleClear() {
    setLocal('')
    if (timer.current) clearTimeout(timer.current)
    onChange('')
  }

  function handleShortcut(v: string) {
    const next = local === v ? '' : v
    setLocal(next)
    if (timer.current) clearTimeout(timer.current)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="relative flex items-center">
        <svg
          className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Cerca tipo di locale... es. cocktail bar, discoteca"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-bg-card text-text text-sm
                     border border-white/10 focus:outline-none focus:border-accent
                     placeholder:text-text-muted"
        />
        {local && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-text-muted hover:text-text"
            aria-label="Cancella ricerca"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleShortcut(s.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              local === s.value
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
