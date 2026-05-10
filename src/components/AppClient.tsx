// src/components/AppClient.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAppState } from '@/hooks/useAppState'
import ModeToggle from './ModeToggle'
import DateTabs from './DateTabs'
import LocationChip from './LocationChip'
import LocationOverlay from './LocationOverlay'
import SplitView from './SplitView'
import BottomNav from './BottomNav'
import EventDetailModal from './EventDetailModal'
import VenueSearch from './VenueSearch'
import EventSearch from './EventSearch'
import RecommendationsPanel from './RecommendationsPanel'
import RatingChips from './RatingChips'
import FilterDrawer from './FilterDrawer'
import { useFilteredEvents } from '@/hooks/useFilteredEvents'
import { serializeEventsForLLM } from '@/lib/serializeEvents'
import { filterEvents } from '@/lib/filterEvents'
import { tagCache } from '@/lib/tagCache'
import type { TimeOfDay, EventType, Setting } from '@/lib/types'

type SearchResult = {
  rankedIds: string[]
  reasons: Record<string, string>
}

type MobileTab = 'events' | 'map' | 'venues'

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('events')
  const [minRating, setMinRating] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  const { events: filteredEvents, enriching } = useFilteredEvents(events, {
    timeOfDay: filters.timeOfDay,
    eventType: filters.eventType,
    setting: filters.setting,
  })

  const isVenueMode = filters.mode === 'venues'

  const visibleEvents = isVenueMode && minRating > 0
    ? events.filter((e) => (e.rating ?? 0) >= minRating)
    : isVenueMode
      ? events
      : filteredEvents

  const eventDates = new Set(events.map((e) => e.date.slice(0, 10)))

  useEffect(() => {
    if (geoStatus === 'denied' && !location) setLocationOpen(true)
  }, [geoStatus, location])

  function handleMobileTabChange(tab: MobileTab) {
    setMobileTab(tab)
    if (tab === 'venues') {
      setFilters({ ...filters, mode: 'venues', date: undefined })
    } else if (tab === 'events') {
      setFilters({ ...filters, mode: 'events' })
    }
  }

  function handleModeToggle(mode: 'events' | 'venues') {
    setFilters({
      ...filters,
      mode,
      q: mode === 'events' ? undefined : filters.q,
      date: mode === 'venues' ? undefined : filters.date,
    })
    if (mode === 'venues') setMobileTab('venues')
    else setMobileTab('events')
  }

  async function handleSearchSubmit(query: string) {
    if (searching) return
    setSearching(true)
    try {
      const payload = serializeEventsForLLM(visibleEvents)
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, events: payload }),
      })
      if (!res.ok) {
        setSearchResult({ rankedIds: [], reasons: {} })
        return
      }
      const data = (await res.json()) as {
        filters?: {
          timeOfDay?: TimeOfDay[]
          eventType?: EventType[]
          setting?: Setting
        }
        rankedIds?: string[]
        reasons?: Record<string, string>
      }
      const f = data.filters ?? {}
      setFilters({
        ...filters,
        timeOfDay: f.timeOfDay && f.timeOfDay.length ? f.timeOfDay : undefined,
        eventType: f.eventType && f.eventType.length ? f.eventType : undefined,
        setting: f.setting,
      })
      setSearchResult({
        rankedIds: data.rankedIds ?? [],
        reasons: data.reasons ?? {},
      })
    } catch (err) {
      console.error('[search] failed:', err)
      setSearchResult({ rankedIds: [], reasons: {} })
    } finally {
      setSearching(false)
    }
  }

  const recommendedEvents = searchResult
    ? searchResult.rankedIds
        .slice(0, 5)
        .map((id) => events.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
    : []

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata da questo browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        console.log('[geo] raw coords:', lat, lng)
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
          const data = await res.json()
          console.log('[geo] geocode response:', data)
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
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Desktop header */}
      <header className="hidden md:flex h-14 items-center gap-0 px-7 border-b border-border shrink-0 bg-bg">
        <span className="font-display font-black text-xl text-accent tracking-tight mr-6 shrink-0">
          serata
        </span>

        <LocationChip location={location} onClick={() => setLocationOpen(true)} />

        <ModeToggle mode={filters.mode} onChange={handleModeToggle} className="mx-4 shrink-0" />

        <div className="w-px h-5 bg-border mx-3 shrink-0" />

        {isVenueMode ? (
          <>
            <VenueSearch
              value={filters.q ?? ''}
              onChange={(q) => setFilters({ ...filters, q: q || undefined })}
            />
            <div className="w-px h-5 bg-border mx-3 shrink-0" />
            <RatingChips value={minRating} onChange={setMinRating} />
          </>
        ) : (
          <>
            <EventSearch onSubmit={handleSearchSubmit} loading={searching} />
            <div className="w-px h-5 bg-border mx-3 shrink-0" />
            <DateTabs
              value={filters.date}
              onChange={(date) => setFilters({ ...filters, date })}
              eventDates={eventDates}
              location={location ? { city: location.name, lat: location.lat, lng: location.lng, radiusKm: filters.radiusKm } : undefined}
            />

            <button
              onClick={() => setDrawerOpen(true)}
              className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[11px] font-medium"
            >
              ⚙ Filtri
              {((filters.timeOfDay?.length ?? 0) + (filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)) > 0 && (
                <span className="ml-1 text-accent">
                  ({(filters.timeOfDay?.length ?? 0) + (filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)})
                </span>
              )}
              {enriching && <span className="ml-1 animate-pulse">…</span>}
            </button>
          </>
        )}

        <div className="flex-1" />

        <span className="text-xs text-muted shrink-0 tabular-nums">
          {visibleEvents.length} {isVenueMode ? 'locali' : 'eventi'}
        </span>
      </header>

      {/* Mobile header */}
      <header className="flex md:hidden flex-col shrink-0 bg-bg border-b border-border z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display font-black text-xl text-accent tracking-tight">serata</span>
          <LocationChip location={location} onClick={() => setLocationOpen(true)} />
        </div>
        {isVenueMode ? (
          <div className="px-4 pb-3 pt-1 flex flex-col gap-2">
            <VenueSearch
              value={filters.q ?? ''}
              onChange={(q) => setFilters({ ...filters, q: q || undefined })}
            />
            <RatingChips value={minRating} onChange={setMinRating} />
          </div>
        ) : (
          <>
            <div className="px-4 pt-1">
              <EventSearch onSubmit={handleSearchSubmit} loading={searching} />
            </div>
            <div className="flex items-center gap-2 px-4 pb-3 pt-2">
              <DateTabs
                value={filters.date}
                onChange={(date) => setFilters({ ...filters, date })}
                eventDates={eventDates}
                location={location ? { city: location.name, lat: location.lat, lng: location.lng, radiusKm: filters.radiusKm } : undefined}
              />
              <button
                onClick={() => setDrawerOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[11px] font-medium"
              >
                ⚙
                {((filters.timeOfDay?.length ?? 0) + (filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)) > 0 && (
                  <span className="text-accent">
                    {(filters.timeOfDay?.length ?? 0) + (filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </header>

      {!isVenueMode && searchResult && (
        <RecommendationsPanel
          events={recommendedEvents}
          reasons={searchResult.reasons}
          onSelect={setSelectedEvent}
          onDismiss={() => setSearchResult(null)}
        />
      )}

      <SplitView
        events={visibleEvents}
        loading={loading}
        city={location?.name}
        highlightedId={highlightedId}
        onCardHover={setHighlightedId}
        onSelect={setSelectedEvent}
        mobileTab={mobileTab}
        isVenueMode={isVenueMode}
        radiusKm={filters.radiusKm}
        onRadiusChange={(km) => setFilters({ ...filters, radiusKm: km })}
      />

      <BottomNav activeTab={mobileTab} onChange={handleMobileTabChange} />

      <LocationOverlay
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelect={setLocation}
        onUseMyLocation={handleUseMyLocation}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <FilterDrawer
        open={drawerOpen}
        timeOfDay={filters.timeOfDay ?? []}
        eventType={filters.eventType ?? []}
        setting={filters.setting}
        onApply={({ timeOfDay, eventType, setting }) => {
          setFilters({
            ...filters,
            timeOfDay: timeOfDay.length ? timeOfDay : undefined,
            eventType: eventType.length ? eventType : undefined,
            setting,
          })
          setDrawerOpen(false)
        }}
        onClose={() => setDrawerOpen(false)}
        previewCount={(pending) => filterEvents(events, pending, tagCache).length}
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
