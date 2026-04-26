// src/components/AppClient.tsx
'use client'

import { Suspense } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAppState } from '@/hooks/useAppState'
import CitySearchBar from './CitySearchBar'
import FilterBar from './FilterBar'
import KeywordSearch from './KeywordSearch'
import SplitView from './SplitView'
import EmptyState from './EmptyState'
import EventDetailModal from './EventDetailModal'

function AppInner() {
  const {
    city,
    events,
    filters,
    loading,
    geoStatus,
    selectedEvent,
    highlightedId,
    setCity,
    setFilters,
    setSelectedEvent,
    setHighlightedId,
  } = useAppState()

  const isVenueMode = Boolean(filters.q)
  const label = city
    ? `${events.length} ${isVenueMode ? (events.length === 1 ? 'locale' : 'locali') : (events.length === 1 ? 'evento' : 'eventi')} a ${city}`
    : null

  const showEmpty = geoStatus === 'denied' && !city

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Fixed header */}
      <header className="shrink-0 bg-bg border-b border-white/10 px-4 py-3 z-30">
        <div className="max-w-none space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-accent font-bold text-xl shrink-0">Serata</span>
            <CitySearchBar value={city} onCitySelect={setCity} />
          </div>
          <KeywordSearch
            value={filters.q ?? ''}
            onChange={(q) => setFilters({ ...filters, q: q || undefined })}
          />
          <FilterBar activeFilters={filters} onChange={setFilters} />
          {label && <p className="text-text-muted text-xs">{label}</p>}
        </div>
      </header>

      {/* Main area */}
      {showEmpty ? (
        <EmptyState onCitySelect={setCity} />
      ) : (
        <SplitView
          events={events}
          loading={loading}
          highlightedId={highlightedId}
          onCardHover={setHighlightedId}
          onSelect={setSelectedEvent}
        />
      )}

      {/* Detail modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}

export default function AppClient() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Suspense>
        <AppInner />
      </Suspense>
    </APIProvider>
  )
}
