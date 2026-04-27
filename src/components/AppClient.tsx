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
import FilterSheet from './FilterSheet'
import SplitView from './SplitView'
import BottomNav from './BottomNav'
import EventDetailModal from './EventDetailModal'

type MobileTab = 'events' | 'map' | 'venues'

function FilterButton({ onClick, activeCount }: { onClick: () => void; activeCount: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-md
        text-xs font-medium text-text hover:border-border transition-colors shrink-0"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
      <span>filtri</span>
      {activeCount > 0 && (
        <span className="w-4 h-4 rounded-full bg-accent text-bg text-[10px] font-bold flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </button>
  )
}

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
  const [filterOpen, setFilterOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('events')

  const isVenueMode = filters.mode === 'venues'

  useEffect(() => {
    if (geoStatus === 'denied' && !location) setLocationOpen(true)
  }, [geoStatus, location])

  const activeFilterCount =
    (filters.free ? 1 : 0) +
    (filters.radiusKm !== 10 ? 1 : 0) +
    (filters.category?.length ? 1 : 0)

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
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
        const data = await res.json()
        if (data.city && data.lat !== null && data.lng !== null) {
          setLocation({ name: data.city, lat: data.lat, lng: data.lng })
        }
      } catch { /* ignore */ }
    })
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

        {!isVenueMode && (
          <DateTabs
            value={filters.date}
            onChange={(date) => setFilters({ ...filters, date })}
          />
        )}

        <div className="w-px h-5 bg-border mx-3 shrink-0" />

        <CategoryChips
          value={filters.category}
          onChange={(category) => setFilters({ ...filters, category: category.length ? category : undefined })}
        />

        <div className="flex-1" />

        <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />

        <span className="text-xs text-muted ml-4 shrink-0 tabular-nums">
          {events.length} {isVenueMode ? 'locali' : 'eventi'}
        </span>
      </header>

      {/* Mobile header */}
      <header className="flex md:hidden flex-col shrink-0 bg-bg border-b border-border z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display font-black text-xl text-accent tracking-tight">serata</span>
          <LocationChip location={location} onClick={() => setLocationOpen(true)} />
        </div>
        {!isVenueMode && (
          <DateTabs
            value={filters.date}
            onChange={(date) => setFilters({ ...filters, date })}
            className="px-4"
          />
        )}
        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          <CategoryChips
            value={filters.category}
            onChange={(category) => setFilters({ ...filters, category: category.length ? category : undefined })}
          />
          <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
        </div>
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
      />

      <BottomNav activeTab={mobileTab} onChange={handleMobileTabChange} />

      <LocationOverlay
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelect={setLocation}
        onUseMyLocation={handleUseMyLocation}
      />

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
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
