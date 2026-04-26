'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import KeywordSearch from '@/components/KeywordSearch'
import SplitView from '@/components/SplitView'
import { Event } from '@/lib/types'

type Filters = {
  date?: 'today' | 'weekend'
  q?: string
  free: boolean
}

type Props = {
  events: Event[]
  city: string
  initialFilters: Filters
}

export default function CityPageClient({ events, city, initialFilters }: Props) {
  const router = useRouter()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  function buildUrl(filters: Filters) {
    const sp = new URLSearchParams()
    if (filters.date) sp.set('date', filters.date)
    if (filters.q && filters.q.trim()) sp.set('q', filters.q.trim())
    if (filters.free) sp.set('free', 'true')
    const qs = sp.toString()
    return `/${encodeURIComponent(city)}${qs ? `?${qs}` : ''}`
  }

  function handleFilterChange(filters: Filters) {
    router.push(buildUrl(filters))
  }

  function handleKeyword(q: string) {
    router.push(buildUrl({ ...initialFilters, q }))
  }

  const isVenueMode = Boolean(initialFilters.q)
  const label = isVenueMode
    ? `${events.length} local${events.length === 1 ? 'e' : 'i'} a ${city}`
    : `${events.length} event${events.length === 1 ? 'o' : 'i'} a ${city}`

  return (
    <>
      {/* Keyword search */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        <KeywordSearch value={initialFilters.q ?? ''} onChange={handleKeyword} />
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-4 max-w-5xl mx-auto">
        <FilterBar activeFilters={initialFilters} onChange={handleFilterChange} />
      </div>

      {/* Results count */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        <p className="text-text-muted text-sm">{label}</p>
      </div>

      {/* Split View */}
      <SplitView
        events={events}
        loading={false}
        highlightedId={highlightedId}
        onCardHover={setHighlightedId}
        onSelect={(event) => setHighlightedId(event.id)}
      />
    </>
  )
}
