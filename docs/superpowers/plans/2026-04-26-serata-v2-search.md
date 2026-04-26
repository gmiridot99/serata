# Serata v2: Search Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove mock events, add a tab-based Events/Venues split, a scrollable day-picker, and zone-aware location search with radius control.

**Architecture:** `LocationSearch` replaces `CitySearchBar` and returns `{ name, lat, lng }` so all API calls use coordinates + radius instead of a city string. A `mode` field in `Filters` selects between Ticketmaster (events) and Google Places (venues). The `EventQuery` type gains `lat/lng/radiusKm/mode`. `useAppState` stores a `Location` object instead of a plain city string. URL carries `city` (display label) + `lat` + `lng` + `radius` + `mode`.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, `@vis.gl/react-google-maps`, TypeScript, Google Places Autocomplete, Ticketmaster Discovery API v2, Google Places API (New)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Modify** | `src/lib/sources/index.ts` | Remove MockSource; route by `mode` instead of `q` |
| **Modify** | `src/lib/types.ts` | Add `Location` type; expand `EventQuery` with `lat/lng/radiusKm/mode`; expand `date` to `string` |
| **Modify** | `src/app/api/geocode/route.ts` | Return `{ city, lat, lng }` (previously only `{ city }`) |
| **Modify** | `src/app/api/events/route.ts` | Parse `lat`, `lng`, `radius`, `mode`; accept `YYYY-MM-DD` date |
| **Modify** | `src/lib/sources/ticketmaster.ts` | Use `latlong+radius` when coords present; handle `YYYY-MM-DD` date |
| **Modify** | `src/lib/sources/places.ts` | Add `locationBias` circle when coords present |
| **Modify** | `src/hooks/useAppState.ts` | Replace `city: string` with `location: Location`; add `mode` + `radiusKm` to `Filters` |
| **Create** | `src/components/LocationSearch.tsx` | Replaces `CitySearchBar`; uses Places Autocomplete with `(regions)` type; returns `{ name, lat, lng }` |
| **Create** | `src/components/ModeTab.tsx` | Tab toggle: "Eventi" / "Locali" |
| **Create** | `src/components/DateScroll.tsx` | Horizontal scrollable day pills: Stasera + next 6 days |
| **Create** | `src/components/VenueSearch.tsx` | Keyword input + shortcut pills for Locali mode |
| **Create** | `src/components/RadiusSelector.tsx` | 5 / 10 / 25 / 50 km pill selector |
| **Modify** | `src/components/AppClient.tsx` | Wire all new components; remove `FilterBar`, `KeywordSearch` |
| **Delete** | `src/components/CitySearchBar.tsx` | Replaced by `LocationSearch` |
| **Delete** | `src/components/KeywordSearch.tsx` | Absorbed into `VenueSearch` |
| **Delete** | `src/components/FilterBar.tsx` | Replaced by `DateScroll`, `VenueSearch`, and an inline Gratis button |

---

## Task 1: Remove MockSource

**Files:**
- Modify: `src/lib/sources/index.ts`

- [ ] **Replace the sources array** — remove `MockSource` import and usage. Also switch routing from `q`-based to `mode`-based:

```ts
// src/lib/sources/index.ts
import { cache } from 'react'
import type { Event, EventQuery } from '@/lib/types'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'

const eventSources = [
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
]

const placesSource = new PlacesSource(process.env.GOOGLE_PLACES_API_KEY ?? '')

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  if (query.mode === 'venues') {
    return placesSource.fetch(query)
  }
  const results = await Promise.allSettled(eventSources.map((s) => s.fetch(query)))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[sources] source[${i}] failed:`, r.reason)
    }
  })
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
git commit -m "feat: remove MockSource; route events/venues by mode param"
```

---

## Task 2: Expand types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Rewrite the file** — add `Location` type; add `lat/lng/radiusKm/mode` to `EventQuery`; widen `date` to accept any string (for `YYYY-MM-DD`):

```ts
// src/lib/types.ts
export type EventCategory = 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'

export type EventPrice =
  | 'free'
  | { min: number; max: number; currency: string }

export type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string
  startTime: string
  endTime?: string
  venue: {
    name: string
    address: string
    lat: number
    lng: number
  }
  price: EventPrice
  imageUrl?: string
  ticketUrl: string
  source: string
}

export type Location = {
  name: string   // display label, e.g. "Navigli, Milano" or "Seregno"
  lat: number
  lng: number
}

export type EventQuery = {
  city: string              // display name — always required for labels
  lat?: number              // when present, use coords+radius instead of city string
  lng?: number
  radiusKm?: number         // defaults to 10 when lat/lng present
  category?: EventCategory | EventCategory[]
  date?: string             // 'today' | 'weekend' | 'YYYY-MM-DD'
  free?: boolean
  q?: string                // venues mode keyword
  mode?: 'events' | 'venues'
}

export interface EventSource {
  fetch(query: EventQuery): Promise<Event[]>
  fetchById?(id: string): Promise<Event | null>
}
```

- [ ] **Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Location type; expand EventQuery with coords/radius/mode"
```

---

## Task 3: Update geocode route to return lat/lng

**Files:**
- Modify: `src/app/api/geocode/route.ts`

The route receives the browser's `lat`/`lng` already — return them alongside the resolved city name so the client can build a full `Location` object without a second round-trip.

- [ ] **Rewrite the file**:

```ts
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ city: null, lat: null, lng: null }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('latlng', `${lat},${lng}`)
    url.searchParams.set('result_type', 'locality')
    url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

    const res = await fetch(url.toString())
    if (!res.ok) return NextResponse.json({ city: null, lat: null, lng: null })

    const data = await res.json()
    const result = data.results?.[0]
    if (!result) return NextResponse.json({ city: null, lat: null, lng: null })

    const locality = result.address_components?.find(
      (c: { types: string[] }) => c.types.includes('locality')
    )
    const city = locality?.long_name ?? null

    return NextResponse.json({ city, lat: latNum, lng: lngNum })
  } catch {
    return NextResponse.json({ city: null, lat: null, lng: null })
  }
}
```

- [ ] **Smoke test**: start dev server and visit `http://localhost:3000/api/geocode?lat=45.46&lng=9.18`

Expected response: `{"city":"Milano","lat":45.46,"lng":9.18}`

- [ ] **Commit**

```bash
git add src/app/api/geocode/route.ts
git commit -m "feat: geocode route now returns lat/lng alongside city name"
```

---

## Task 4: Update events API route

**Files:**
- Modify: `src/app/api/events/route.ts`

- [ ] **Rewrite the file** — add `lat`, `lng`, `radius`, `mode` parsing; accept `YYYY-MM-DD` as a valid `date` value:

```ts
// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/sources'
import type { EventCategory, EventQuery } from '@/lib/types'

const VALID_CATEGORIES = new Set<EventCategory>([
  'club', 'concert', 'aperitivo', 'theatre', 'other',
])

function isValidCategory(v: string): v is EventCategory {
  return VALID_CATEGORIES.has(v as EventCategory)
}

function isValidDate(v: string): boolean {
  return v === 'today' || v === 'weekend' || /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const city = searchParams.get('city')
    if (!city) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const query: EventQuery = { city }

    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    if (latParam && lngParam) {
      query.lat = parseFloat(latParam)
      query.lng = parseFloat(lngParam)
      const radiusParam = searchParams.get('radius')
      if (radiusParam) query.radiusKm = Math.max(1, parseInt(radiusParam, 10))
    }

    const modeParam = searchParams.get('mode')
    if (modeParam === 'events' || modeParam === 'venues') {
      query.mode = modeParam
    }

    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      const parts = categoryParam.split(',').map(s => s.trim()).filter(Boolean)
      const categories = parts.filter(isValidCategory)
      if (categories.length === 1) query.category = categories[0]
      else if (categories.length > 1) query.category = categories
    }

    const dateParam = searchParams.get('date')
    if (dateParam && isValidDate(dateParam)) {
      query.date = dateParam
    }

    if (searchParams.get('free') === 'true') {
      query.free = true
    }

    const q = searchParams.get('q')
    if (q?.trim()) {
      query.q = q.trim()
    }

    const events = await fetchEvents(query)
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Commit**

```bash
git add src/app/api/events/route.ts
git commit -m "feat: events API accepts lat/lng/radius/mode and YYYY-MM-DD date"
```

---

## Task 5: Update TicketmasterSource

**Files:**
- Modify: `src/lib/sources/ticketmaster.ts`

Two changes:
1. When `query.lat` and `query.lng` are present, use `latlong` + `radius` + `unit=km` instead of `city`.
2. `getDateRange` now accepts any `string` (not just the union), and handles `YYYY-MM-DD`.

- [ ] **Replace `getDateRange`** — change signature from `date: 'today' | 'weekend'` to `date: string`, add YYYY-MM-DD branch:

```ts
function getDateRange(date: string): { start: string; end: string } {
  const now = new Date()

  if (date === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 0)
    return { start: toTmDate(start), end: toTmDate(end) }
  }

  if (date === 'weekend') {
    const day = now.getDay()
    const daysToSat = day === 0 ? 6 : 6 - day
    const sat = new Date(now)
    sat.setDate(now.getDate() + daysToSat)
    sat.setHours(0, 0, 0, 0)
    const sun = new Date(sat)
    sun.setDate(sat.getDate() + 1)
    sun.setHours(23, 59, 59, 0)
    return { start: toTmDate(sat), end: toTmDate(sun) }
  }

  // YYYY-MM-DD — specific day in local time
  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(year, month - 1, day, 0, 0, 0)
  const end = new Date(year, month - 1, day, 23, 59, 59)
  return { start: toTmDate(start), end: toTmDate(end) }
}
```

- [ ] **Update `fetch` method** — use lat/lng when present, else city:

Replace the block that builds the params in `TicketmasterSource.fetch`:

```ts
async fetch(query: EventQuery): Promise<Event[]> {
  const categories: EventCategory[] = query.category
    ? Array.isArray(query.category)
      ? query.category
      : [query.category]
    : []

  const tmCategories = categories.filter(c => c !== 'aperitivo' && c !== 'club')
  if (categories.length > 0 && tmCategories.length === 0) return []

  const params = new URLSearchParams({
    apikey: this.apiKey,
    countryCode: 'IT',
    size: '50',
  })

  if (query.lat !== undefined && query.lng !== undefined) {
    params.set('latlong', `${query.lat},${query.lng}`)
    params.set('radius', String(query.radiusKm ?? 10))
    params.set('unit', 'km')
  } else {
    params.set('city', query.city)
  }

  if (tmCategories.length > 0) {
    const tmClassifications = tmCategories.map(c => {
      if (c === 'concert') return 'music'
      if (c === 'theatre') return 'arts & theatre'
      return 'miscellaneous'
    })
    params.set('classificationName', tmClassifications[0])
  }

  if (query.date) {
    const range = getDateRange(query.date)
    params.set('startDateTime', range.start)
    params.set('endDateTime', range.end)
  } else {
    params.set('startDateTime', toTmDate(new Date()))
  }

  const res = await fetch(`${TM_BASE}/events.json?${params}`)
  if (!res.ok) throw new Error(`Ticketmaster error: ${res.status}`)

  const data = await res.json()
  const events: TmEvent[] = data._embedded?.events ?? []
  const normalized = events.map(normalizeEvent)

  if (query.free) {
    return normalized.filter(e => e.price === 'free')
  }
  return normalized
}
```

- [ ] **Commit**

```bash
git add src/lib/sources/ticketmaster.ts
git commit -m "feat: Ticketmaster source supports lat/lng radius and specific date"
```

---

## Task 6: Update PlacesSource

**Files:**
- Modify: `src/lib/sources/places.ts`

When `query.lat` and `query.lng` are present, add a `locationBias` circle to the Places Text Search request body. The Google Places API (New) accepts radius in **meters**.

- [ ] **Update the `fetch` body** — replace the `body: JSON.stringify(...)` call:

```ts
async fetch(query: EventQuery): Promise<Event[]> {
  if (!query.q) return []

  const textQuery = `${query.q} ${query.city}`

  const requestBody: Record<string, unknown> = {
    textQuery,
    languageCode: 'it',
    regionCode: 'IT',
    maxResultCount: 20,
  }

  if (query.lat !== undefined && query.lng !== undefined) {
    requestBody.locationBias = {
      circle: {
        center: { latitude: query.lat, longitude: query.lng },
        radius: (query.radiusKm ?? 10) * 1000,
      },
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify(requestBody),
  })

  if (!res.ok) throw new Error(`Places API error: ${res.status}`)

  const data = await res.json()
  const places: GooglePlace[] = data.places ?? []

  let results = places.map((p) => normalizePlaceToEvent(p, this.apiKey))

  if (query.free) {
    results = results.filter((e) => e.price === 'free')
  }

  const cats = Array.isArray(query.category)
    ? query.category
    : query.category
    ? [query.category]
    : []
  if (cats.length > 0) {
    results = results.filter((e) => cats.includes(e.category))
  }

  return results
}
```

- [ ] **Commit**

```bash
git add src/lib/sources/places.ts
git commit -m "feat: Places source uses locationBias circle when coords present"
```

---

## Task 7: Create LocationSearch component

**Files:**
- Create: `src/components/LocationSearch.tsx`

This replaces `CitySearchBar`. Key differences:
- Uses `types: ['(regions)']` instead of `types: ['(cities)']` — accepts cities AND neighborhoods/zones
- Requests `geometry` field from the Autocomplete result to extract lat/lng
- Callback is `onLocationSelect(loc: Location)` instead of `onCitySelect(name: string)`
- Display label: neighborhood + city (e.g. "Navigli, Milano") when a sub-locality is selected; city name otherwise

- [ ] **Create the file**:

```tsx
// src/components/LocationSearch.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Location } from '@/lib/types'

type Props = {
  value: Location | null
  onLocationSelect: (location: Location) => void
}

export default function LocationSearch({ value, onLocationSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(value?.name ?? '')
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    setInputValue(value?.name ?? '')
  }, [value])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      types: ['(regions)'],
      fields: ['name', 'geometry', 'address_components', 'formatted_address'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.geometry?.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const sublocality = place.address_components?.find(
        (c) => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
      )
      const locality = place.address_components?.find((c) =>
        c.types.includes('locality')
      )

      let name: string
      if (sublocality && locality) {
        name = `${sublocality.long_name}, ${locality.long_name}`
      } else if (locality) {
        name = locality.long_name
      } else {
        name = place.name ?? place.formatted_address ?? ''
      }

      if (name) {
        setInputValue(name)
        onLocationSelect({ name, lat, lng })
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onLocationSelect])

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
        placeholder="Città, quartiere, zona..."
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
git add src/components/LocationSearch.tsx
git commit -m "feat: add LocationSearch with region/neighbourhood autocomplete"
```

---

## Task 8: Create ModeTab component

**Files:**
- Create: `src/components/ModeTab.tsx`

- [ ] **Create the file**:

```tsx
// src/components/ModeTab.tsx
type Props = {
  mode: 'events' | 'venues'
  onChange: (mode: 'events' | 'venues') => void
}

export default function ModeTab({ mode, onChange }: Props) {
  return (
    <div className="flex bg-bg-card rounded-xl p-0.5 gap-0.5">
      <button
        onClick={() => onChange('events')}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
          mode === 'events'
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text'
        }`}
      >
        🎉 Eventi
      </button>
      <button
        onClick={() => onChange('venues')}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
          mode === 'venues'
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text'
        }`}
      >
        🍸 Locali
      </button>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/ModeTab.tsx
git commit -m "feat: add ModeTab for eventi/locali toggle"
```

---

## Task 9: Create DateScroll component

**Files:**
- Create: `src/components/DateScroll.tsx`

Shows 7 pills: "Stasera" (alias for `'today'`) plus the next 6 days as `YYYY-MM-DD`. Each pill shows a short day name + short date. Click active pill to deactivate.

Uses a local date helper to avoid UTC off-by-one: `new Date().toISOString().slice(0,10)` gives UTC midnight, which may differ from local date; use `getFullYear/getMonth/getDate` instead.

- [ ] **Create the file**:

```tsx
// src/components/DateScroll.tsx
'use client'

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Pill = { label: string; sublabel: string; value: string }

function buildPills(): Pill[] {
  const now = new Date()
  const pills: Pill[] = []

  pills.push({
    label: 'Stasera',
    sublabel: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    value: 'today',
  })

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    pills.push({
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      sublabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      value: toLocalIsoDate(d),
    })
  }

  return pills
}

type Props = {
  value?: string
  onChange: (date: string | undefined) => void
}

export default function DateScroll({ value, onChange }: Props) {
  const pills = buildPills()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {pills.map((pill) => {
        const active = value === pill.value
        return (
          <button
            key={pill.value}
            onClick={() => onChange(active ? undefined : pill.value)}
            className={`shrink-0 flex flex-col items-center px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            <span className="font-semibold">{pill.label}</span>
            <span className="opacity-70">{pill.sublabel}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/DateScroll.tsx
git commit -m "feat: add DateScroll with 7-day picker"
```

---

## Task 10: Create VenueSearch component

**Files:**
- Create: `src/components/VenueSearch.tsx`

Combines the debounced keyword input (from `KeywordSearch`) and shortcut pills (from `FilterBar`'s `KEYWORD_PILLS`) into a single component for the Locali mode.

- [ ] **Create the file**:

```tsx
// src/components/VenueSearch.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

const SHORTCUTS = [
  { label: 'Discoteche', value: 'discoteca nightclub' },
  { label: 'Bar & Aperitivo', value: 'aperitivo bar' },
  { label: 'Live Music', value: 'live music concerto' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Cocktail Bar', value: 'cocktail bar' },
  { label: 'Jazz', value: 'jazz bar' },
]

type Props = {
  value: string
  onChange: (q: string) => void
}

export default function VenueSearch({ value, onChange }: Props) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(value) }, [value])

  function handleChange(v: string) {
    setLocal(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v), 500)
  }

  function handleClear() {
    setLocal('')
    if (timer.current) clearTimeout(timer.current)
    onChange('')
  }

  function handleShortcut(v: string) {
    const next = local === v ? '' : v
    setLocal(next)
    if (timer.current) clearTimeout(timer.current)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="relative flex items-center">
        <svg
          className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Cerca tipo di locale... es. cocktail bar, discoteca"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-bg-card text-text text-sm
                     border border-white/10 focus:outline-none focus:border-accent
                     placeholder:text-text-muted"
        />
        {local && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-text-muted hover:text-text"
            aria-label="Cancella ricerca"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleShortcut(s.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              local === s.value
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/VenueSearch.tsx
git commit -m "feat: add VenueSearch with debounced input and shortcut pills"
```

---

## Task 11: Create RadiusSelector component

**Files:**
- Create: `src/components/RadiusSelector.tsx`

- [ ] **Create the file**:

```tsx
// src/components/RadiusSelector.tsx
const RADII = [5, 10, 25, 50] as const

type Props = {
  value: number
  onChange: (km: number) => void
}

export default function RadiusSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {RADII.map((km) => (
        <button
          key={km}
          onClick={() => onChange(km)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === km
              ? 'bg-accent text-white'
              : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
          }`}
        >
          {km} km
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/RadiusSelector.tsx
git commit -m "feat: add RadiusSelector pill component"
```

---

## Task 12: Update useAppState

**Files:**
- Modify: `src/hooks/useAppState.ts`

Major refactor:
- `city: string | null` → `location: Location | null`
- `Filters` gains `mode: 'events' | 'venues'` and `radiusKm: number`; `date` widens to `string`
- `apiFetchEvents` sends `lat`, `lng`, `radius`, `mode`
- `updateUrl` serializes the full `Location` + new filter fields
- Geolocation handler builds a full `Location` from the geocode response (which now returns `lat/lng`)

**Note on old `?city=X` URLs (without lat/lng):** `parseLocation` returns `null` when `lat/lng` are missing. Old bookmarks reset to the empty state — the user must re-type the location. This is acceptable for this version.

- [ ] **Rewrite the file**:

```ts
// src/hooks/useAppState.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Event, Location } from '@/lib/types'

export type Filters = {
  mode: 'events' | 'venues'
  date?: string       // 'today' | 'weekend' | 'YYYY-MM-DD'
  free: boolean
  q?: string          // venues mode keyword
  radiusKm: number    // default 10
}

export type GeoStatus = 'pending' | 'granted' | 'denied'

export type AppState = {
  location: Location | null
  events: Event[]
  filters: Filters
  loading: boolean
  geoStatus: GeoStatus
  selectedEvent: Event | null
  highlightedId: string | null
  setLocation: (location: Location) => void
  setFilters: (filters: Filters) => void
  setSelectedEvent: (event: Event | null) => void
  setHighlightedId: (id: string | null) => void
}

function parseFilters(params: URLSearchParams): Filters {
  const modeVal = params.get('mode')
  const dateVal = params.get('date')
  const radiusVal = params.get('radius')
  return {
    mode: modeVal === 'venues' ? 'venues' : 'events',
    date: dateVal ?? undefined,
    free: params.get('free') === 'true',
    q: params.get('q') ?? undefined,
    radiusKm: Math.max(1, parseInt(radiusVal ?? '10', 10) || 10),
  }
}

function parseLocation(params: URLSearchParams): Location | null {
  const city = params.get('city')
  const lat = parseFloat(params.get('lat') ?? '')
  const lng = parseFloat(params.get('lng') ?? '')
  if (!city || isNaN(lat) || isNaN(lng)) return null
  return { name: city, lat, lng }
}

async function apiFetchEvents(location: Location, filters: Filters): Promise<Event[]> {
  const params = new URLSearchParams({
    city: location.name,
    lat: String(location.lat),
    lng: String(location.lng),
    radius: String(filters.radiusKm),
    mode: filters.mode,
  })
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

  const [location, setLocationState] = useState<Location | null>(
    () => parseLocation(new URLSearchParams(searchParams.toString()))
  )
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFiltersState] = useState<Filters>(
    () => parseFilters(new URLSearchParams(searchParams.toString()))
  )
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('pending')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const locationRef = useRef(location)
  locationRef.current = location
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const updateUrl = useCallback(
    (newLocation: Location | null, newFilters: Filters) => {
      const params = new URLSearchParams()
      if (newLocation) {
        params.set('city', newLocation.name)
        params.set('lat', String(newLocation.lat))
        params.set('lng', String(newLocation.lng))
      }
      params.set('mode', newFilters.mode)
      if (newFilters.date) params.set('date', newFilters.date)
      if (newFilters.free) params.set('free', 'true')
      if (newFilters.q) params.set('q', newFilters.q)
      if (newFilters.radiusKm !== 10) params.set('radius', String(newFilters.radiusKm))
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [router]
  )

  const loadEvents = useCallback(async (loc: Location, f: Filters) => {
    setLoading(true)
    try {
      const data = await apiFetchEvents(loc, f)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const setLocation = useCallback(
    (newLocation: Location) => {
      setLocationState(newLocation)
      updateUrl(newLocation, filtersRef.current)
      loadEvents(newLocation, filtersRef.current)
    },
    [loadEvents, updateUrl]
  )

  const setFilters = useCallback(
    (newFilters: Filters) => {
      setFiltersState(newFilters)
      if (locationRef.current) {
        updateUrl(locationRef.current, newFilters)
        loadEvents(locationRef.current, newFilters)
      }
    },
    [loadEvents, updateUrl]
  )

  // Geolocation on mount — skip if location already in URL
  useEffect(() => {
    const urlLocation = parseLocation(new URLSearchParams(searchParams.toString()))
    if (urlLocation) {
      setGeoStatus('granted')
      loadEvents(urlLocation, parseFilters(new URLSearchParams(searchParams.toString())))
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
          if (data.city && data.lat !== null && data.lng !== null) {
            const newLocation: Location = {
              name: data.city,
              lat: data.lat,
              lng: data.lng,
            }
            setGeoStatus('granted')
            setLocationState(newLocation)
            updateUrl(newLocation, filtersRef.current)
            loadEvents(newLocation, filtersRef.current)
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
  }
}
```

- [ ] **Commit**

```bash
git add src/hooks/useAppState.ts
git commit -m "refactor: useAppState uses Location object, mode, and radiusKm"
```

---

## Task 13: Update AppClient

**Files:**
- Modify: `src/components/AppClient.tsx`

Replace `CitySearchBar` → `LocationSearch`, `FilterBar` → mode-conditional filter rows, wire `ModeTab`, `DateScroll`, `VenueSearch`, `RadiusSelector`. Remove `KeywordSearch` import.

- [ ] **Rewrite the file**:

```tsx
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
```

- [ ] **Commit**

```bash
git add src/components/AppClient.tsx
git commit -m "feat: wire LocationSearch, ModeTab, DateScroll, VenueSearch, RadiusSelector"
```

---

## Task 14: Delete replaced files

**Files:**
- Delete: `src/components/CitySearchBar.tsx` (replaced by `LocationSearch.tsx`)
- Delete: `src/components/KeywordSearch.tsx` (absorbed into `VenueSearch.tsx`)
- Delete: `src/components/FilterBar.tsx` (replaced by `DateScroll`, `VenueSearch`, and inline Gratis button)

- [ ] **Delete**:

```bash
rm src/components/CitySearchBar.tsx
rm src/components/KeywordSearch.tsx
rm src/components/FilterBar.tsx
```

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: remove CitySearchBar, KeywordSearch, FilterBar (replaced)"
```

---

## Task 15: Typecheck + smoke test

**Files:** none (verification only)

- [ ] **Run TypeScript compiler**:

```bash
npx tsc --noEmit
```

Expected: zero errors. Common type errors to watch for:
- `AppState.city` referenced anywhere → rename to `AppState.location`
- `Filters.q` used in events-mode code → it's fine, it's just `undefined`
- `EventQuery.date` union narrowed somewhere → it's now `string`, check type guards in the API route

- [ ] **Start dev server and verify manually**:

```bash
npm run dev
```

Check these flows in the browser:

1. Open `http://localhost:3000` → browser asks for location
2. Grant location → geolocation resolves to city, events load (no mock events)
3. Deny location → EmptyState shows
4. Type "Navigli, Milano" in location search → autocomplete → select → events/venues load with coords
5. Type "Seregno" → select → events load
6. Switch to tab **Locali** → keyword search appears, date/gratis disappears
7. In Locali, type "cocktail bar" or click a shortcut → venues appear
8. Switch back to **Eventi** → keyword clears, date scroll reappears
9. Click "Stasera" → date filter active → events filter to today
10. Click "Stasera" again → deactivates
11. Click any future day pill → events filter to that day
12. Change radius to 25 km → events reload with wider radius
13. Click Gratis → only free events
14. Click a card → modal opens
15. Visit `http://localhost:3000/?city=Roma&lat=41.89&lng=12.48` → direct URL load works

- [ ] **Final commit** (only if tsc had fixable errors):

```bash
git add -A
git commit -m "fix: typecheck corrections after v2 search refactor"
```
