'use client'

import { useState, useEffect, useRef } from 'react'

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

  return (
    <div className="relative flex items-center flex-1 min-w-0">
      <svg
        className="absolute left-3 w-3.5 h-3.5 text-muted pointer-events-none"
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
        placeholder="Cerca locali... es. cocktail bar, discoteca"
        className="w-full pl-9 pr-8 py-2 rounded-full bg-elev text-text text-sm
                   border border-border focus:outline-none focus:border-accent
                   placeholder:text-muted"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-muted hover:text-text text-xs cursor-pointer"
          aria-label="Cancella"
        >
          ✕
        </button>
      )}
    </div>
  )
}
