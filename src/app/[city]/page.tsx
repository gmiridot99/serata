'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import FilterBar from '@/components/FilterBar'
import SplitView from '@/components/SplitView'
import { Event, EventCategory } from '@/lib/types'

type Filters = {
  date?: 'today' | 'weekend'
  categories: EventCategory[]
  free: boolean
}

type Props = {
  params: Promise<{ city: string }>
}

export default function CityPage({ params }: Props) {
  const { city } = use(params)
  const decodedCity = decodeURIComponent(city)

  const [filters, setFilters] = useState<Filters>({
    date: undefined,
    categories: [],
    free: false,
  })
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      setLoading(true)
      const sp = new URLSearchParams({ city: decodedCity })
      if (filters.date) sp.set('date', filters.date)
      if (filters.categories.length > 0)
        sp.set('category', filters.categories.join(','))
      if (filters.free) sp.set('free', 'true')

      try {
        const data: Event[] = await fetch(`/api/events?${sp}`).then((r) =>
          r.json()
        )
        if (!cancelled) setEvents(data)
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [decodedCity, filters.date, filters.free, filters.categories])

  function handlePinClick(id: string) {
    setHighlightedId(id)
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-bold text-text mt-2 capitalize">
          {decodedCity}
        </h1>
      </header>

      {/* Filter Bar */}
      <div className="px-4 pb-4 max-w-5xl mx-auto">
        <FilterBar activeFilters={filters} onChange={setFilters} />
      </div>

      {/* Results count */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        {loading ? (
          <p className="text-text-muted text-sm">Caricamento...</p>
        ) : (
          <p className="text-text-muted text-sm">
            {events.length} event{events.length === 1 ? 'o' : 'i'} a{' '}
            {decodedCity}
          </p>
        )}
      </div>

      {/* Split View */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="text-text-muted text-lg">Caricamento...</span>
        </div>
      ) : (
        <SplitView
          events={events}
          highlightedId={highlightedId}
          onCardHover={setHighlightedId}
          onPinClick={handlePinClick}
        />
      )}
    </div>
  )
}
