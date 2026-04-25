'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function KeywordSearch({ value, onChange, placeholder }: Props) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync quando value cambia dall'esterno (es. navigazione back/forward)
  useEffect(() => {
    setLocal(value)
  }, [value])

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

  return (
    <div className="relative flex items-center">
      {/* search icon */}
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
        placeholder={placeholder ?? 'Cerca tipo di locale... es. cocktail bar, discoteca jazz'}
        className="w-full pl-9 pr-8 py-2 rounded-xl bg-bg-card text-text text-sm
                   border border-white/10 focus:outline-none focus:border-accent
                   placeholder:text-text-muted"
      />

      {/* clear button */}
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
  )
}
