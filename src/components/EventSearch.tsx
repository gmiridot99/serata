'use client'

import { useState } from 'react'

type Props = {
  onSubmit: (query: string) => void
  loading?: boolean
}

export default function EventSearch({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q || loading) return
    onSubmit(q)
  }

  const canSubmit = value.trim().length > 0 && !loading

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center w-full md:w-80 shrink-0 rounded-full
                 bg-elev border border-border focus-within:border-accent
                 transition-colors overflow-hidden"
    >
      <span className="absolute left-3 text-[10px] font-bold tracking-wider text-accent pointer-events-none">
        AI
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cerca eventi: techno outdoor sabato..."
        className="w-full pl-10 pr-12 py-2 bg-transparent text-text text-base md:text-sm
                   focus:outline-none placeholder:text-muted"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        aria-label="Cerca"
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center
                   w-8 h-8 rounded-full bg-accent text-bg
                   disabled:opacity-30 disabled:cursor-not-allowed
                   enabled:hover:brightness-110 enabled:cursor-pointer transition"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </button>
    </form>
  )
}
