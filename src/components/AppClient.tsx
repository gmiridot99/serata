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
import FilterSheet from './FilterSheet'
import ModeToggle from './ModeToggle'
import MapFAB from './MapFAB'
import MapSheet from './MapSheet'
import EventList from './EventList'
import { haversineKm } from '@/lib/distance'
import { filterEvents } from '@/lib/filterEvents'
import { tagCache } from '@/lib/tagCache'
import DesktopListPanel from './desktop/DesktopListPanel'
import DesktopDetailPanel from './desktop/DesktopDetailPanel'
import DesktopMapPanel from './desktop/DesktopMapPanel'

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
  const [mapFullscreen, setMapFullscreen] = useState(false)

  useEffect(() => {
    if (geoStatus === 'denied' && !location) setLocationOpen(true)
  }, [geoStatus, location])

  const isVenueMode = filters.mode === 'venues'
  const userLocation = location ? { lat: location.lat, lng: location.lng } : undefined
  const eventDates = new Set(events.map((e) => e.date.slice(0, 10)))

  const activeCategories: EventCategory[] = Array.isArray(filters.category)
    ? filters.category
    : filters.category ? [filters.category] : []

  const baseEvents = freeOnly ? events.filter((e) => e.price === 'free') : events
  const visibleEvents = filterEvents(baseEvents, {
    timeOfDay: filters.timeOfDay,
  }, tagCache).filter((e) =>
    activeCategories.length === 0 || activeCategories.includes(e.category)
  )

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

      {/* ─── DESKTOP — split persistente: LEFT 460px | MAP flex ─── */}
      <div className="hidden md:flex flex-col h-full">
        {/* Header 60px */}
        <header className="h-[60px] shrink-0 flex items-center gap-3 px-5 border-b border-border bg-bg z-20">
          <span className="font-display font-black text-[20px] text-accent tracking-tight">serata</span>
          <LocationChip location={location} onClick={() => setLocationOpen(true)} />
          <div className="flex-1 flex justify-center">
            <DateTabs
              variant="pill"
              value={filters.date}
              onChange={(date) => setFilters({ ...filters, date })}
              eventDates={eventDates}
              location={location
                ? { city: location.name, lat: location.lat, lng: location.lng, radiusKm: filters.radiusKm }
                : undefined}
            />
          </div>
          <span className="text-xs text-muted tabular-nums shrink-0">
            {visibleEvents.length} {isVenueMode ? 'locali' : 'serate'}
          </span>
          <ModeToggle mode={filters.mode} onChange={handleModeChange} />
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="shrink-0 px-3 py-1.5 rounded-full border border-border text-[11px] font-medium text-bright hover:text-text transition-colors"
          >
            filtri
          </button>
        </header>

        {/* Split body */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT 460px — list OR detail */}
          {!mapFullscreen && (
            <div className="w-[460px] shrink-0 border-r border-border flex flex-col bg-bg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedEvent ? (
                <DesktopDetailPanel
                  event={selectedEvent}
                  onBack={() => setSelectedEvent(null)}
                  eventIndex={visibleEvents.findIndex((e) => e.id === selectedEvent.id) + 1}
                  eventTotal={visibleEvents.length}
                  distanceKm={userLocation
                    ? haversineKm(userLocation, { lat: selectedEvent.venue.lat, lng: selectedEvent.venue.lng })
                    : undefined}
                />
              ) : (
                <DesktopListPanel
                  events={visibleEvents}
                  highlightedId={highlightedId}
                  onSelect={(ev) => { setSelectedEvent(ev); setMapFullscreen(false) }}
                  onHover={setHighlightedId}
                  userLocation={userLocation}
                  isVenueMode={isVenueMode}
                />
              )}
            </div>
          )}

          {/* RIGHT — map always present */}
          <DesktopMapPanel
            events={visibleEvents}
            city={location?.name}
            centerLat={location?.lat}
            centerLng={location?.lng}
            highlightedId={selectedEvent?.id ?? highlightedId}
            onSelect={(ev) => { setSelectedEvent(ev); setMapFullscreen(false) }}
            isVenueMode={isVenueMode}
            fullscreen={mapFullscreen}
            onToggleFullscreen={() => setMapFullscreen((f) => !f)}
          />
        </div>
      </div>

      {/* ─── SHARED OVERLAYS ─── */}
      <MapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        events={visibleEvents}
        city={location?.name}
        centerLat={location?.lat}
        centerLng={location?.lng}
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
        timeOfDay={filters.timeOfDay ?? []}
        free={freeOnly}
        onApply={({ radiusKm, category, timeOfDay, free }) => {
          setFilters({ ...filters, radiusKm, category, timeOfDay: timeOfDay.length ? timeOfDay : undefined })
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
