'use client'

import { useState } from 'react'

type Props = {
  defaultValue?: string
  onSearch: (city: string) => void
}

export default function CitySearch({ defaultValue = '', onSearch }: Props) {
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      onSearch(trimmed)
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cerca una città... es. Milano"
        className="flex-1 bg-bg-card text-text placeholder-text-muted px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </button>
    </form>
  )
}
