// src/components/AppClient.tsx
'use client'

import { Suspense } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAppState } from '@/hooks/useAppState'
import LocationSearch from './LocationSearch'
import ModeTab from './ModeTab'
import DateScroll from './DateScroll'
import VenueSearch from './VenueSearch'
import RadiusSelector from './RadiusSelector'
import SplitView from './SplitView'
import EmptyState from './EmptyState'
import EventDetailModal from './EventDetailModal'

function AppInner() {
  const {
    location,
    events,
    filters,
    loading,
    geoStatus,
    selectedEvent,
    highlightedId,
    setLocation,
    setFilters,
    setSelectedEvent,
    setHighlightedId,
  } = useAppState()

  const isVenueMode = filters.mode === 'venues'

  const label = location
    ? `${events.length} ${
        isVenueMode
          ? events.length === 1 ? 'locale' : 'locali'
          : events.length === 1 ? 'evento' : 'eventi'
      } vicino a ${location.name}`
    : null

  const showEmpty = geoStatus === 'denied' && !location

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <header className="shrink-0 bg-bg border-b border-white/10 px-4 py-3 z-30">
        <div className="max-w-none space-y-2">
          {/* Row 1: logo + location search */}
          <div className="flex items-center gap-3">
            <span className="text-accent font-bold text-xl shrink-0">Serata</span>
            <LocationSearch value={location} onLocationSelect={setLocation} />
          </div>

          {/* Row 2: mode tab */}
          <ModeTab
            mode={filters.mode}
            onChange={(mode) =>
              setFilters({
                ...filters,
                mode,
                q: mode === 'events' ? undefined : filters.q,
                date: mode === 'venues' ? undefined : filters.date,
              })
            }
          />

          {/* Row 3: mode-specific filters */}
          {isVenueMode ? (
            <VenueSearch
              value={filters.q ?? ''}
              onChange={(q) => setFilters({ ...filters, q: q || undefined })}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <DateScroll
                  value={filters.date}
                  onChange={(date) => setFilters({ ...filters, date })}
                />
              </div>
              <button
                onClick={() => setFilters({ ...filters, free: !filters.free })}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.free
                    ? 'bg-accent text-white'
                    : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
                }`}
              >
                Gratis
              </button>
            </div>
          )}

          {/* Row 4: radius selector */}
          <RadiusSelector
            value={filters.radiusKm}
            onChange={(radiusKm) => setFilters({ ...filters, radiusKm })}
          />

          {label && <p className="text-text-muted text-xs">{label}</p>}
        </div>
      </header>

      {showEmpty ? (
        <EmptyState onCitySelect={(name) => setLocation({ name, lat: 0, lng: 0 })} />
      ) : (
        <SplitView
          events={events}
          loading={loading}
          city={location?.name}
          highlightedId={highlightedId}
          onCardHover={setHighlightedId}
          onSelect={setSelectedEvent}
        />
      )}

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
