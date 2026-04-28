// src/components/AppClient.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useAppState } from '@/hooks/useAppState'
import ModeToggle from './ModeToggle'
import DateTabs from './DateTabs'
import CategoryChips from './CategoryChips'
import LocationChip from './LocationChip'
import LocationOverlay from './LocationOverlay'
import SplitView from './SplitView'
import BottomNav from './BottomNav'
import EventDetailModal from './EventDetailModal'
import VenueSearch from './VenueSearch'

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

  const isVenueMode = filters.mode === 'venues'

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
          <VenueSearch
            value={filters.q ?? ''}
            onChange={(q) => setFilters({ ...filters, q: q || undefined })}
          />
        ) : (
          <>
            <DateTabs
              value={filters.date}
              onChange={(date) => setFilters({ ...filters, date })}
            />

            <div className="w-px h-5 bg-border mx-3 shrink-0" />

            <CategoryChips
              value={filters.category}
              onChange={(category) => setFilters({ ...filters, category: category.length ? category : undefined })}
            />
          </>
        )}

        <div className="flex-1" />

        <span className="text-xs text-muted shrink-0 tabular-nums">
          {events.length} {isVenueMode ? 'locali' : 'eventi'}
        </span>
      </header>

      {/* Mobile header */}
      <header className="flex md:hidden flex-col shrink-0 bg-bg border-b border-border z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display font-black text-xl text-accent tracking-tight">serata</span>
          <LocationChip location={location} onClick={() => setLocationOpen(true)} />
        </div>
        {isVenueMode ? (
          <div className="px-4 pb-3 pt-1">
            <VenueSearch
              value={filters.q ?? ''}
              onChange={(q) => setFilters({ ...filters, q: q || undefined })}
            />
          </div>
        ) : (
          <>
            <DateTabs
              value={filters.date}
              onChange={(date) => setFilters({ ...filters, date })}
              className="px-4"
            />
            <div className="flex items-center gap-2 px-4 pb-3 pt-1">
              <CategoryChips
                value={filters.category}
                onChange={(category) => setFilters({ ...filters, category: category.length ? category : undefined })}
              />
            </div>
          </>
        )}
      </header>

      <SplitView
        events={events}
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
