# Single-Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the two-page app into a single `/` route with geolocation, always-visible map+list, and an `EventDetailModal` triggered by card or pin clicks.

**Architecture:** `AppClient` (client component) orchestrates everything: wraps in `APIProvider`, instantiates `useAppState`, renders header with `CitySearchBar` + filters, `SplitView`, and `EventDetailModal`. All async state and fetch logic lives in `useAppState`. URL is updated silently via `router.replace`. The `/[city]` and `/[city]/[id]` routes are deleted.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, Tailwind CSS 4, @vis.gl/react-google-maps 1.8.3, TypeScript, Jest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-26-single-page-redesign.md`

---

## File Map

| Action | Path |
|---|---|
| **Create** | `src/app/api/geocode/route.ts` |
| **Create** | `src/hooks/useAppState.ts` |
| **Create** | `src/components/AppClient.tsx` |
| **Create** | `src/components/CitySearchBar.tsx` |
| **Create** | `src/components/EmptyState.tsx` |
| **Create** | `src/components/EventDetailModal.tsx` |
| **Modify** | `src/app/globals.css` — add modal animations |
| **Modify** | `src/app/page.tsx` — shell only |
| **Modify** | `src/lib/sources/index.ts` — remove Eventbrite |
| **Modify** | `src/components/EventCard.tsx` — add `onClick` |
| **Modify** | `src/components/EventGrid.tsx` — add `onSelect` |
| **Modify** | `src/components/EventMap.tsx` — remove `APIProvider`, add `onSelect(Event)` |
| **Modify** | `src/components/EventMiniMap.tsx` — remove `APIProvider` |
| **Modify** | `src/components/SplitView.tsx` — add `loading`, replace `onPinClick` with `onSelect(Event)` |
| **Delete** | `src/components/CitySearch.tsx` |
| **Delete** | `src/components/CitySearchWrapper.tsx` |
| **Delete** | `src/app/[city]/` (entire directory) |

---

## Task 1: Remove Eventbrite from sources

**Files:**
- Modify: `src/lib/sources/index.ts`

- [ ] **Replace the sources array** — remove `EventbriteSource` import and usage:

```ts
// src/lib/sources/index.ts
import { cache } from 'react'
import type { Event, EventQuery } from '@/lib/types'
import { MockSource } from './mock'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'

const eventSources = [
  new MockSource(),
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
]

const placesSource = new PlacesSource(process.env.GOOGLE_PLACES_API_KEY ?? '')

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  if (query.q) {
    return placesSource.fetch(query)
  }
  const results = await Promise.allSettled(eventSources.map((s) => s.fetch(query)))
  return results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}

export const fetchEventById = cache(async (id: string): Promise<Event | null> => {
  if (id.startsWith('places_')) {
    return placesSource.fetchById(id)
  }
  for (const source of eventSources) {
    if (source.fetchById) {
      try {
        const event = await source.fetchById(id)
        if (event) return event
      } catch {
        // try next source
      }
    }
  }
  return null
})
```

- [ ] **Commit**

```bash
git add src/lib/sources/index.ts
git commit -m "fix: remove broken Eventbrite source (API deprecated)"
```

---

## Task 2: Add modal animations to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Append keyframes and theme tokens** at the end of the file:

```css
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes slideRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

@theme inline {
  --animate-slide-up: slideUp 0.3s ease-out;
  --animate-slide-right: slideRight 0.3s ease-out;
}
```

This makes `animate-slide-up` and `animate-slide-right` available as Tailwind utility classes.

- [ ] **Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add slide-up and slide-right animation utilities"
```

---

## Task 3: Create `/api/geocode` route

**Files:**
- Create: `src/app/api/geocode/route.ts`

- [ ] **Create the file**:

```ts
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ city: null }, { status: 400 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('latlng', `${lat},${lng}`)
    url.searchParams.set('result_type', 'locality')
    url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

    const res = await fetch(url.toString())
    if (!res.ok) return NextResponse.json({ city: null })

    const data = await res.json()
    const result = data.results?.[0]
    if (!result) return NextResponse.json({ city: null })

    const locality = result.address_components?.find(
      (c: { types: string[] }) => c.types.includes('locality')
    )
    const city = locality?.long_name ?? null

    return NextResponse.json({ city })
  } catch {
    return NextResponse.json({ city: null })
  }
}
```

- [ ] **Manual smoke test** — start the dev server (`npm run dev`) and visit:
  `http://localhost:3000/api/geocode?lat=45.46&lng=9.18`
  Expected response: `{"city":"Milan"}` or `{"city":"Milano"}` (depends on locale returned by Google)

- [ ] **Commit**

```bash
git add src/app/api/geocode/route.ts
git commit -m "feat: add /api/geocode reverse geocoding route"
```

---

## Task 4: Create `useAppState` hook

**Files:**
- Create: `src/hooks/useAppState.ts`

- [ ] **Create the hook**:

```ts
// src/hooks/useAppState.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Event } from '@/lib/types'

export type Filters = {
  date?: 'today' | 'weekend'
  free: boolean
  q?: string
}

export type GeoStatus = 'pending' | 'granted' | 'denied'

export type AppState = {
  city: string | null
  events: Event[]
  filters: Filters
  loading: boolean
  geoStatus: GeoStatus
  selectedEvent: Event | null
  highlightedId: string | null
  setCity: (city: string) => void
  setFilters: (filters: Filters) => void
  setSelectedEvent: (event: Event | null) => void
  setHighlightedId: (id: string | null) => void
}

async function apiFetchEvents(city: string, filters: Filters): Promise<Event[]> {
  const params = new URLSearchParams({ city })
  if (filters.date) params.set('date', filters.date)
  if (filters.free) params.set('free', 'true')
  if (filters.q) params.set('q', filters.q)
  const res = await fetch(`/api/events?${params}`)
  if (!res.ok) throw new Error(`events fetch failed: ${res.status}`)
  return res.json()
}

export function useAppState(): AppState {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [city, setCityState] = useState<string | null>(
    searchParams.get('city') || null
  )
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFiltersState] = useState<Filters>({
    date: (searchParams.get('date') as 'today' | 'weekend' | null) ?? undefined,
    free: searchParams.get('free') === 'true',
    q: searchParams.get('q') ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('pending')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const updateUrl = useCallback(
    (newCity: string | null, newFilters: Filters) => {
      const params = new URLSearchParams()
      if (newCity) params.set('city', newCity)
      if (newFilters.date) params.set('date', newFilters.date)
      if (newFilters.free) params.set('free', 'true')
      if (newFilters.q) params.set('q', newFilters.q)
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [router]
  )

  const loadEvents = useCallback(async (newCity: string, newFilters: Filters) => {
    setLoading(true)
    try {
      const data = await apiFetchEvents(newCity, newFilters)
      setEvents(data)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const setCity = useCallback(
    (newCity: string) => {
      setCityState(newCity)
      setFiltersState((prev) => {
        updateUrl(newCity, prev)
        loadEvents(newCity, prev)
        return prev
      })
    },
    [loadEvents, updateUrl]
  )

  const setFilters = useCallback(
    (newFilters: Filters) => {
      setFiltersState(newFilters)
      setCityState((prev) => {
        if (prev) {
          updateUrl(prev, newFilters)
          loadEvents(prev, newFilters)
        }
        return prev
      })
    },
    [loadEvents, updateUrl]
  )

  // Geolocation on mount — skip if city already in URL
  useEffect(() => {
    const urlCity = searchParams.get('city')
    if (urlCity) {
      setGeoStatus('granted')
      loadEvents(urlCity, {
        date: (searchParams.get('date') as 'today' | 'weekend' | null) ?? undefined,
        free: searchParams.get('free') === 'true',
        q: searchParams.get('q') ?? undefined,
      })
      return
    }

    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          )
          const data = await res.json()
          if (data.city) {
            setGeoStatus('granted')
            setCityState(data.city)
            updateUrl(data.city, filters)
            loadEvents(data.city, filters)
          } else {
            setGeoStatus('denied')
          }
        } catch {
          setGeoStatus('denied')
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 10000 }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
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
  }
}
```

- [ ] **Commit**

```bash
git add src/hooks/useAppState.ts
git commit -m "feat: add useAppState hook with geolocation and event fetching"
```

---

## Task 5: Create `EmptyState` component

**Files:**
- Create: `src/components/EmptyState.tsx`

- [ ] **Create the file**:

```tsx
// src/components/EmptyState.tsx
type Props = {
  onCitySelect: (city: string) => void
}

export default function EmptyState({ onCitySelect: _onCitySelect }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-5xl">🌆</span>
      <h2 className="text-xl font-semibold text-text">Dove sei stasera?</h2>
      <p className="text-text-muted text-sm max-w-xs">
        Cerca una città nella barra in alto per scoprire eventi, locali e serate
        nella tua zona.
      </p>
    </div>
  )
}
```

Note: the CitySearchBar is already in the header — EmptyState only shows the prompt message. `onCitySelect` is kept in props for future use (e.g. a secondary search input).

- [ ] **Commit**

```bash
git add src/components/EmptyState.tsx
git commit -m "feat: add EmptyState component for no-city state"
```

---

## Task 6: Create `CitySearchBar` component

**Files:**
- Create: `src/components/CitySearchBar.tsx`

This component uses `useMapsLibrary('places')` from `@vis.gl/react-google-maps` to attach Google Places Autocomplete to the input. It must be rendered inside an `<APIProvider>` (provided by `AppClient`).

- [ ] **Create the file**:

```tsx
// src/components/CitySearchBar.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type Props = {
  value: string | null
  onCitySelect: (city: string) => void
}

export default function CitySearchBar({ value, onCitySelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(value ?? '')
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Sync display value when city changes from geolocation
  useEffect(() => {
    setInputValue(value ?? '')
  }, [value])

  // Attach Google Places Autocomplete once the library loads
  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['address_components', 'name'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place) return
      const locality = place.address_components?.find((c) =>
        c.types.includes('locality')
      )
      const cityName = locality?.long_name ?? place.name ?? ''
      if (cityName) {
        setInputValue(cityName)
        onCitySelect(cityName)
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onCitySelect])

  return (
    <div className="relative flex items-center flex-1">
      <svg
        className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Cerca una città..."
        className="w-full pl-9 pr-4 py-2 bg-bg-card text-text text-sm rounded-xl
                   border border-white/10 focus:outline-none focus:border-accent
                   placeholder:text-text-muted"
      />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/CitySearchBar.tsx
git commit -m "feat: add CitySearchBar with Google Places Autocomplete"
```

---

## Task 7: Modify `EventCard` — add `onClick`

**Files:**
- Modify: `src/components/EventCard.tsx`

- [ ] **Add `onClick` prop** — add to the `Props` type and the root `<div>`:

```tsx
// src/components/EventCard.tsx
'use client'

import { Event, EventCategory } from '@/lib/types'

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: 'bg-purple-600',
  concert: 'bg-blue-600',
  aperitivo: 'bg-orange-500',
  theatre: 'bg-green-600',
  other: 'bg-gray-600',
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club: 'Club',
  concert: 'Concerto',
  aperitivo: 'Aperitivo',
  theatre: 'Teatro',
  other: 'Altro',
}

type Props = {
  event: Event
  highlighted?: boolean
  onHover?: () => void
  onHoverEnd?: () => void
  onClick?: () => void
}

export default function EventCard({ event, highlighted, onHover, onHoverEnd, onClick }: Props) {
  const formattedDate = new Date(event.date).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timeRange = event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : event.startTime

  const priceDisplay =
    event.price === 'free'
      ? 'Gratis'
      : event.price.min === event.price.max
      ? `€${event.price.min}`
      : `€${event.price.min} – €${event.price.max}`

  return (
    <div
      className={`bg-bg-card rounded-xl overflow-hidden transition-all cursor-pointer ${
        highlighted ? 'ring-2 ring-accent' : ''
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      <div className="relative aspect-video">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg to-bg-card" />
        )}
        <span
          className={`absolute top-2 left-2 ${CATEGORY_COLORS[event.category]} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
      </div>

      <div className="p-4 space-y-1">
        <h3 className="text-lg font-semibold text-text leading-snug">{event.title}</h3>
        <p className="text-sm text-text-muted">
          {formattedDate} · {timeRange}
        </p>
        <p className="text-sm text-text-muted">{event.venue.name}</p>
        <p className="text-sm font-medium text-accent">{priceDisplay}</p>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/EventCard.tsx
git commit -m "feat: add onClick prop to EventCard"
```

---

## Task 8: Modify `EventGrid` — add `onSelect`

**Files:**
- Modify: `src/components/EventGrid.tsx`

- [ ] **Add `onSelect` prop**, pass to each `EventCard` as `onClick`:

```tsx
// src/components/EventGrid.tsx
'use client'

import { Event } from '@/lib/types'
import EventCard from './EventCard'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onCardHover?: (id: string | null) => void
  onSelect?: (event: Event) => void
}

export default function EventGrid({ events, highlightedId, onCardHover, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-muted text-lg">Nessun evento trovato</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          highlighted={event.id === highlightedId}
          onHover={() => onCardHover?.(event.id)}
          onHoverEnd={() => onCardHover?.(null)}
          onClick={() => onSelect?.(event)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/EventGrid.tsx
git commit -m "feat: add onSelect prop to EventGrid"
```

---

## Task 9: Modify `EventMap` — remove `APIProvider`, add `onSelect(Event)`

**Files:**
- Modify: `src/components/EventMap.tsx`

`APIProvider` moves to `AppClient` — remove it here. Also replace `onPinClick(id)` with `onSelect(event)` so pin clicks open the modal.

- [ ] **Rewrite the file**:

```tsx
// src/components/EventMap.tsx
'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Event, EventCategory } from '@/lib/types'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onSelect?: (event: Event) => void
  className?: string
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: '#7c3aed',
  concert: '#2563eb',
  aperitivo: '#f97316',
  theatre: '#16a34a',
  other: '#6b7280',
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

export default function EventMap({ events, highlightedId, onSelect, className }: Props) {
  const mappableEvents = events.filter((e) => e.venue.lat !== 0 || e.venue.lng !== 0)

  const defaultCenter =
    mappableEvents.length > 0
      ? { lat: mappableEvents[0].venue.lat, lng: mappableEvents[0].venue.lng }
      : { lat: 42, lng: 12.5 }

  const defaultZoom = mappableEvents.length > 0 ? 12 : 6

  return (
    <div
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      style={{ height: '100%', minHeight: '400px' }}
    >
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        styles={DARK_STYLE}
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {mappableEvents.map((event) => {
          const isHighlighted = event.id === highlightedId
          const bgColor = isHighlighted ? '#e94560' : CATEGORY_COLORS[event.category]
          return (
            <AdvancedMarker
              key={event.id}
              position={{ lat: event.venue.lat, lng: event.venue.lng }}
              onClick={() => onSelect?.(event)}
              style={isHighlighted ? { transform: 'scale(1.3)', zIndex: 10 } : undefined}
            >
              <Pin background={bgColor} borderColor={bgColor} glyphColor="#ffffff" />
            </AdvancedMarker>
          )
        })}
      </Map>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/EventMap.tsx
git commit -m "refactor: remove APIProvider from EventMap, pin click opens modal"
```

---

## Task 10: Modify `EventMiniMap` — remove `APIProvider`

**Files:**
- Modify: `src/components/EventMiniMap.tsx`

`APIProvider` is now an ancestor via `AppClient`. Remove the wrapper here.

- [ ] **Rewrite the file**:

```tsx
// src/components/EventMiniMap.tsx
'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

type Venue = {
  name: string
  address: string
  lat: number
  lng: number
}

type Props = {
  venue: Venue
  className?: string
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

export default function EventMiniMap({ venue, className }: Props) {
  if (venue.lat === 0 && venue.lng === 0) return null

  return (
    <div
      className={`h-40 w-full rounded-xl overflow-hidden${className ? ` ${className}` : ''}`}
    >
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: venue.lat, lng: venue.lng }}
        defaultZoom={15}
        styles={DARK_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <AdvancedMarker position={{ lat: venue.lat, lng: venue.lng }}>
          <Pin background="#e94560" borderColor="#e94560" glyphColor="#ffffff" />
        </AdvancedMarker>
      </Map>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/EventMiniMap.tsx
git commit -m "refactor: remove APIProvider from EventMiniMap"
```

---

## Task 11: Modify `SplitView` — add `loading`, replace `onPinClick` with `onSelect(Event)`

**Files:**
- Modify: `src/components/SplitView.tsx`

- [ ] **Rewrite the file**:

```tsx
// src/components/SplitView.tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'
import EventGrid from './EventGrid'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  events: Event[]
  loading: boolean
  highlightedId: string | null
  onCardHover: (id: string | null) => void
  onSelect: (event: Event) => void
}

type MobileView = 'grid' | 'map'

export default function SplitView({ events, loading, highlightedId, onCardHover, onSelect }: Props) {
  const [mobileView, setMobileView] = useState<MobileView>('grid')

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile toggle */}
      <div className="flex md:hidden gap-2 p-3 bg-bg-card border-b border-white/10">
        <button
          onClick={() => setMobileView('grid')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileView === 'grid'
              ? 'bg-accent text-white'
              : 'bg-bg text-text-muted hover:text-text'
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileView === 'map'
              ? 'bg-accent text-white'
              : 'bg-bg text-text-muted hover:text-text'
          }`}
        >
          Mappa
        </button>
      </div>

      {/* Mobile: single view */}
      <div className="md:hidden flex-1">
        {mobileView === 'grid' ? (
          <div className="p-4">
            <EventGrid
              events={events}
              highlightedId={highlightedId}
              onCardHover={onCardHover}
              onSelect={onSelect}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-160px)]">
            <EventMap
              events={events}
              highlightedId={highlightedId}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto p-6">
          <EventGrid
            events={events}
            highlightedId={highlightedId}
            onCardHover={onCardHover}
            onSelect={onSelect}
          />
        </div>
        <div className="w-1/2 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <EventMap
            events={events}
            highlightedId={highlightedId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/SplitView.tsx
git commit -m "refactor: SplitView accepts onSelect(Event) and loading prop"
```

---

## Task 12: Create `EventDetailModal`

**Files:**
- Create: `src/components/EventDetailModal.tsx`

- [ ] **Create the file**:

```tsx
// src/components/EventDetailModal.tsx
'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Event, EventCategory, EventPrice } from '@/lib/types'

const EventMiniMap = dynamic(() => import('./EventMiniMap'), { ssr: false })

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club: 'Club',
  concert: 'Concerto',
  aperitivo: 'Aperitivo',
  theatre: 'Teatro',
  other: 'Altro',
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: 'bg-purple-600',
  concert: 'bg-blue-600',
  aperitivo: 'bg-orange-500',
  theatre: 'bg-green-600',
  other: 'bg-gray-600',
}

function formatPrice(price: EventPrice): string {
  if (price === 'free') return 'Gratuito'
  if (price.min === price.max) return `€${price.min}`
  return `€${price.min} – €${price.max}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type Props = {
  event: Event | null
  onClose: () => void
}

export default function EventDetailModal({ event, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!event) return null

  const isPlace = event.source === 'places'
  const hasCoords = event.venue.lat !== 0 || event.venue.lng !== 0
  const categoryColor = CATEGORY_COLORS[event.category] ?? 'bg-gray-600'
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category

  return (
    <>
      {/* Backdrop (mobile: closes on tap; desktop: decorative) */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:bg-transparent"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, slide-over on desktop */}
      <div
        className={[
          'fixed z-50 bg-bg overflow-y-auto',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl animate-slide-up',
          // Desktop: right slide-over
          'md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-screen md:rounded-none md:animate-slide-right',
        ].join(' ')}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors"
        >
          ✕
        </button>

        {/* Hero image */}
        <div className="relative h-48 w-full overflow-hidden shrink-0">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bg-card to-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <span
            className={`absolute bottom-3 left-4 ${categoryColor} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-bold text-text leading-snug">{event.title}</h2>

          {/* Date + time only for non-place events */}
          {!isPlace && event.startTime && (
            <>
              <div className="flex items-start gap-2 text-sm text-text">
                <span>📅</span>
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-text">
                <span>🕐</span>
                <span>
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ''}
                </span>
              </div>
            </>
          )}

          <div className="flex items-start gap-2 text-sm text-text">
            <span>📍</span>
            <span>
              {event.venue.name}
              {event.venue.address ? `, ${event.venue.address}` : ''}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm text-text">
            <span>💰</span>
            <span>{formatPrice(event.price)}</span>
          </div>

          {event.description && (
            <p className="text-text-muted text-sm leading-relaxed">{event.description}</p>
          )}

          {/* Mini-map */}
          {hasCoords && <EventMiniMap venue={event.venue} />}

          {/* CTA */}
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-accent text-white text-center py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {isPlace ? 'Apri in Google Maps →' : 'Compra biglietti →'}
          </a>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/EventDetailModal.tsx
git commit -m "feat: add EventDetailModal slide-over/bottom-sheet component"
```

---

## Task 13: Create `AppClient`

**Files:**
- Create: `src/components/AppClient.tsx`

`AppClient` is the root client component. It moves `APIProvider` here (previously in `EventMap` and `EventMiniMap`), wraps `useAppState` in a `<Suspense>` (required by `useSearchParams`), and composes all UI sections.

- [ ] **Create the file**:

```tsx
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
```

- [ ] **Commit**

```bash
git add src/components/AppClient.tsx
git commit -m "feat: add AppClient root component with geolocation and modal"
```

---

## Task 14: Update `app/page.tsx` to shell

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Replace entire file**:

```tsx
// src/app/page.tsx
import AppClient from '@/components/AppClient'

export default function Home() {
  return <AppClient />
}
```

- [ ] **Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: page.tsx becomes a thin shell rendering AppClient"
```

---

## Task 15: Delete old files

**Files to delete:**
- `src/components/CitySearch.tsx`
- `src/components/CitySearchWrapper.tsx`
- `src/app/[city]/` (entire directory — contains `page.tsx` and `[id]/page.tsx`)

- [ ] **Delete the files**:

```bash
rm src/components/CitySearch.tsx
rm src/components/CitySearchWrapper.tsx
rm -rf "src/app/[city]"
```

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: remove old city page routes and unused city search components"
```

---

## Task 16: Typecheck + smoke test

**Files:** none (verification only)

- [ ] **Run TypeScript compiler**:

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any type mismatches before proceeding.

- [ ] **Start dev server and verify manually**:

```bash
npm run dev
```

Check these flows in the browser:
1. Open `http://localhost:3000` → browser asks for location
2. Grant location → map centers on your city, events load
3. Deny location → EmptyState shows with "Cerca una città" message
4. Type a city in the CitySearchBar → autocomplete dropdown appears → select → map + list update
5. Click a card → `EventDetailModal` slides in
6. Click a map pin → modal opens with correct event
7. Press ESC → modal closes
8. Change keyword filter → results update in-place
9. Navigate to `http://localhost:3000/?city=Roma` directly → events for Roma load immediately (no geolocation needed)

- [ ] **Run tests**:

```bash
npm test
```

Expected: all existing tests pass. (No new tests added — UI components are verified manually.)

- [ ] **Final commit** (if any last-minute fixes):

```bash
git add -A
git commit -m "fix: typecheck and smoke test corrections"
```
