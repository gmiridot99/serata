// src/components/AppClient.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAppState } from '@/hooks/useAppState'
import type { EventCategory } from '@/lib/types'
import DateTabs from './DateTabs'
import CategoryChips from './CategoryChips'
import LocationChip from './LocationChip'
import LocationOverlay from './LocationOverlay'
import BottomNav from './BottomNav'
import EventDetailModal from './EventDetailModal'
import EventDetailPanel from './EventDetailPanel'
import Sidebar from './Sidebar'
import FilterSheet from './FilterSheet'
import ModeToggle from './ModeToggle'
import MapFAB from './MapFAB'
import MapSheet from './MapSheet'
import EventList from './EventList'

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

  const [locationOpen, setLocationOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [freeOnly, setFreeOnly] = useState(false)

  useEffect(() => {
    if (geoStatus === 'denied' && !location) setLocationOpen(true)
  }, [geoStatus, location])

  const isVenueMode = filters.mode === 'venues'
  const userLocation = location ? { lat: location.lat, lng: location.lng } : undefined
  const eventDates = new Set(events.map((e) => e.date.slice(0, 10)))

  const activeCategories: EventCategory[] = Array.isArray(filters.category)
    ? filters.category
    : filters.category ? [filters.category] : []

  const visibleEvents = freeOnly
    ? events.filter((e) => e.price === 'free')
    : events

  function handleModeChange(mode: 'events' | 'venues') {
    setFilters({
      ...filters,
      mode,
      q: mode === 'events' ? undefined : filters.q,
      date: mode === 'venues' ? undefined : filters.date,
    })
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata da questo browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
          const data = await res.json()
          setLocation({
            name: data.city ?? 'La mia posizione',
            lat: data.lat ?? lat,
            lng: data.lng ?? lng,
          })
        } catch {
          setLocation({ name: 'La mia posizione', lat, lng })
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Permesso negato. Abilita la geolocalizzazione nelle impostazioni del browser.',
          2: 'Posizione non disponibile.',
          3: 'Timeout rilevamento posizione.',
        }
        alert(msgs[err.code] ?? 'Errore geolocalizzazione.')
      },
      { timeout: 10000 }
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-bg">

      {/* ─── MOBILE ─── */}
      <div className="flex flex-col h-full md:hidden">
        <header className="shrink-0 bg-bg border-b border-border z-30">
          {/* Row 1: wordmark + location */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-display font-black text-xl text-accent tracking-tight">serata</span>
            <LocationChip location={location} onClick={() => setLocationOpen(true)} />
          </div>
          {/* Row 2: date tabs */}
          <DateTabs
            value={filters.date}
            onChange={(date) => setFilters({ ...filters, date })}
            eventDates={eventDates}
            location={location
              ? { city: location.name, lat: location.lat, lng: location.lng, radiusKm: filters.radiusKm }
              : undefined}
          />
          {/* Row 3: category chips + filter button */}
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex-1 min-w-0">
              <CategoryChips
                value={activeCategories}
                onChange={(cats) => setFilters({ ...filters, category: cats })}
              />
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-full border border-border text-[11px] font-medium text-bright hover:text-text transition-colors"
            >
              filtri
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <EventList
              events={visibleEvents}
              highlightedId={highlightedId}
              onCardHover={setHighlightedId}
              onSelect={setSelectedEvent}
              userLocation={userLocation}
            />
          )}
        </main>

        <BottomNav activeMode={filters.mode} onChange={handleModeChange} />
        <MapFAB onClick={() => setMapOpen((o) => !o)} isOpen={mapOpen} />
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden md:flex h-full">
        <Sidebar
          cityName={location?.name}
          radiusKm={filters.radiusKm}
          activeDate={filters.date}
          onDateChange={(date) => setFilters({ ...filters, date })}
          activeCategories={activeCategories}
          onCategoryChange={(cats) => setFilters({ ...filters, category: cats })}
          onCityClick={() => setLocationOpen(true)}
          free={freeOnly}
          onFreeChange={setFreeOnly}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Desktop topbar */}
          <div className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-border bg-bg z-20">
            <LocationChip location={location} onClick={() => setLocationOpen(true)} />
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted tabular-nums">
                {visibleEvents.length} {isVenueMode ? 'locali' : 'eventi'}
              </span>
              <ModeToggle mode={filters.mode} onChange={handleModeChange} />
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="px-3 py-1.5 rounded-full border border-border text-[11px] font-medium text-bright hover:text-text transition-colors"
              >
                filtri
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-[720px] mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <EventList
                  events={visibleEvents}
                  highlightedId={highlightedId}
                  onCardHover={setHighlightedId}
                  onSelect={setSelectedEvent}
                  userLocation={userLocation}
                />
              )}
            </div>
          </main>
        </div>

        <MapFAB onClick={() => setMapOpen((o) => !o)} isOpen={mapOpen} />

        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>

      {/* ─── SHARED OVERLAYS ─── */}
      <MapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        events={visibleEvents}
        city={location?.name}
        highlightedId={highlightedId}
        onSelect={setSelectedEvent}
        isVenueMode={isVenueMode}
        radiusKm={filters.radiusKm}
        onRadiusChange={(km) => setFilters({ ...filters, radiusKm: km })}
      />

      <LocationOverlay
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelect={setLocation}
        onUseMyLocation={handleUseMyLocation}
      />

      {/* Mobile-only detail modal */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        radiusKm={filters.radiusKm}
        category={activeCategories}
        free={freeOnly}
        onApply={({ radiusKm, category, free }) => {
          setFilters({ ...filters, radiusKm, category })
          setFreeOnly(free)
        }}
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
