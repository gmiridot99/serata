'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import SplitView from '@/components/SplitView'
import { Event, EventCategory } from '@/lib/types'

type Filters = {
  date?: 'today' | 'weekend'
  categories: EventCategory[]
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

  function handleFilterChange(filters: Filters) {
    const sp = new URLSearchParams()
    if (filters.date) sp.set('date', filters.date)
    if (filters.categories.length > 0) sp.set('category', filters.categories.join(','))
    if (filters.free) sp.set('free', 'true')
    const qs = sp.toString()
    router.push(`/${encodeURIComponent(city)}${qs ? `?${qs}` : ''}`)
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="px-4 pb-4 max-w-5xl mx-auto">
        <FilterBar activeFilters={initialFilters} onChange={handleFilterChange} />
      </div>

      {/* Results count */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        <p className="text-text-muted text-sm">
          {events.length} event{events.length === 1 ? 'o' : 'i'} a {city}
        </p>
      </div>

      {/* Split View */}
      <SplitView
        events={events}
        highlightedId={highlightedId}
        onCardHover={setHighlightedId}
        onPinClick={setHighlightedId}
      />
    </>
  )
}
