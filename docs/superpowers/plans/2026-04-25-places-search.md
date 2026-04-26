# Places Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere ricerca keyword di locali tramite Google Places Text Search API, con input testuale libero e pill-scorciatoia nella FilterBar.

**Architecture:** Quando l'utente digita una keyword (`q`), la query viene passata all'API route che attiva `PlacesSource` (Google Places Text Search) al posto delle sorgenti eventi esistenti. I risultati vengono normalizzati al tipo `Event` esistente e visualizzati nella griglia e mappa già presenti. Quando `q` è assente, si usano le sorgenti eventi normali (Ticketmaster + MockSource).

**Tech Stack:** Google Places API (New, v1) · `@vis.gl/react-google-maps` (già installato) · Next.js 16 App Router · TypeScript

---

## File Structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/lib/types.ts` | Modifica | Aggiungere `q?: string` a `EventQuery` |
| `src/lib/sources/places.ts` | Crea | `PlacesSource` — chiama Places Text Search API, normalizza in `Event[]` |
| `src/lib/sources/index.ts` | Modifica | Instrada a `PlacesSource` quando `q` è presente |
| `src/app/api/events/route.ts` | Modifica | Legge param `q` e lo passa alla query |
| `src/components/KeywordSearch.tsx` | Crea | Input testuale debounced per keyword, con tasto clear |
| `src/components/FilterBar.tsx` | Modifica | Aggiunge pill-scorciatoia keyword (Discoteche, Aperitivo, Live Music, Teatro) |
| `src/components/CityPageClient.tsx` | Modifica | Integra `KeywordSearch`, passa `q` nell'URL |
| `src/app/[city]/page.tsx` | Modifica | Legge `q` da `searchParams`, passa a `EventQuery` e a `CityPageClient` |
| `__tests__/lib/sources/places.test.ts` | Crea | TDD per `normalizePlaceToEvent` |
| `.env.local.example` | Modifica | Aggiunge `GOOGLE_PLACES_API_KEY` |

---

## Task 1: Aggiungere `q` a EventQuery e API route

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/events/route.ts`

- [ ] **Step 1: Aggiungere `q` a EventQuery**

In `src/lib/types.ts`, aggiungere `q?: string` a `EventQuery`:

```ts
export type EventQuery = {
  city: string
  category?: EventCategory | EventCategory[]
  date?: 'today' | 'weekend'
  free?: boolean
  q?: string   // keyword search (es. "cocktail bar", "discoteca techno")
}
```

- [ ] **Step 2: Leggere `q` nell'API route**

In `src/app/api/events/route.ts`, aggiungere dopo il parsing di `freeParam`:

```ts
const q = searchParams.get('q')
if (q && q.trim()) {
  query.q = q.trim()
}
```

- [ ] **Step 3: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output (zero errori).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/app/api/events/route.ts
git commit -m "feat: add keyword search param q to EventQuery and API route"
```

---

## Task 2: PlacesSource (TDD)

**Files:**
- Create: `__tests__/lib/sources/places.test.ts`
- Create: `src/lib/sources/places.ts`

### Google Places API (New) — riferimento

**Endpoint ricerca:**
```
POST https://places.googleapis.com/v1/places:searchText
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: {GOOGLE_PLACES_API_KEY}
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos,places.googleMapsUri,places.priceLevel

Body:
{
  "textQuery": "cocktail bar Milano",
  "languageCode": "it",
  "regionCode": "IT",
  "maxResultCount": 20
}
```

**Risposta:**
```json
{
  "places": [
    {
      "id": "ChIJexample",
      "displayName": { "text": "Bar Basso", "languageCode": "it" },
      "formattedAddress": "Via Plinio, 39, 20129 Milano MI, Italia",
      "location": { "latitude": 45.4654, "longitude": 9.2083 },
      "types": ["bar", "food", "point_of_interest", "establishment"],
      "photos": [{ "name": "places/ChIJexample/photos/AXCi2Q", "widthPx": 4032, "heightPx": 3024 }],
      "googleMapsUri": "https://maps.google.com/?cid=123",
      "priceLevel": "PRICE_LEVEL_MODERATE"
    }
  ]
}
```

**URL foto:** `https://places.googleapis.com/v1/{photo.name}/media?maxWidthPx=800&key={API_KEY}`

**Endpoint singolo posto (per fetchById):**
```
GET https://places.googleapis.com/v1/places/{place_id}
   ?fields=id,displayName,formattedAddress,location,types,photos,googleMapsUri,priceLevel
   &key={API_KEY}
```

- [ ] **Step 1: Scrivere il test per `normalizePlaceToEvent`**

Creare `__tests__/lib/sources/places.test.ts`:

```ts
import { normalizePlaceToEvent } from '@/lib/sources/places'

const mockPlace = {
  id: 'ChIJtest123',
  displayName: { text: 'Bar Basso', languageCode: 'it' },
  formattedAddress: 'Via Plinio, 39, 20129 Milano MI, Italia',
  location: { latitude: 45.4654, longitude: 9.2083 },
  types: ['bar', 'food', 'point_of_interest'],
  photos: [{ name: 'places/ChIJtest123/photos/AXCi2Q', widthPx: 4032, heightPx: 3024 }],
  googleMapsUri: 'https://maps.google.com/?cid=123',
  priceLevel: 'PRICE_LEVEL_MODERATE',
}

describe('normalizePlaceToEvent', () => {
  it('maps id with places_ prefix', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.id).toBe('places_ChIJtest123')
  })

  it('maps displayName to title', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.title).toBe('Bar Basso')
  })

  it('maps location to venue lat/lng', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.venue.lat).toBe(45.4654)
    expect(event.venue.lng).toBe(9.2083)
  })

  it('maps formattedAddress to venue address', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.venue.address).toBe('Via Plinio, 39, 20129 Milano MI, Italia')
  })

  it('maps bar type to aperitivo category', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.category).toBe('aperitivo')
  })

  it('maps night_club type to club category', () => {
    const clubPlace = { ...mockPlace, types: ['night_club', 'establishment'] }
    const event = normalizePlaceToEvent(clubPlace, 'test-api-key')
    expect(event.category).toBe('club')
  })

  it('maps PRICE_LEVEL_MODERATE to price range', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.price).toEqual({ min: 15, max: 35, currency: 'EUR' })
  })

  it('maps PRICE_LEVEL_FREE to free', () => {
    const freePlace = { ...mockPlace, priceLevel: 'PRICE_LEVEL_FREE' }
    const event = normalizePlaceToEvent(freePlace, 'test-api-key')
    expect(event.price).toBe('free')
  })

  it('maps missing priceLevel to free', () => {
    const { priceLevel: _, ...noPrice } = mockPlace
    const event = normalizePlaceToEvent(noPrice, 'test-api-key')
    expect(event.price).toBe('free')
  })

  it('builds photo URL correctly', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.imageUrl).toBe(
      'https://places.googleapis.com/v1/places/ChIJtest123/photos/AXCi2Q/media?maxWidthPx=800&key=test-api-key'
    )
  })

  it('uses googleMapsUri as ticketUrl', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.ticketUrl).toBe('https://maps.google.com/?cid=123')
  })

  it('sets source to places', () => {
    const event = normalizePlaceToEvent(mockPlace, 'test-api-key')
    expect(event.source).toBe('places')
  })
})
```

- [ ] **Step 2: Eseguire il test — deve fallire**

```bash
npx jest __tests__/lib/sources/places.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/sources/places'`

- [ ] **Step 3: Creare `src/lib/sources/places.ts`**

```ts
import type { Event, EventCategory, EventPrice, EventQuery, EventSource } from '@/lib/types'

type GooglePlace = {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  types: string[]
  photos?: Array<{ name: string; widthPx: number; heightPx: number }>
  googleMapsUri: string
  priceLevel?: string
}

const TYPE_TO_CATEGORY: Record<string, EventCategory> = {
  night_club: 'club',
  cocktail_bar: 'club',
  pub: 'club',
  bar: 'aperitivo',
  wine_bar: 'aperitivo',
  cafe: 'aperitivo',
  restaurant: 'aperitivo',
  performing_arts_theater: 'theatre',
  theater: 'theatre',
  concert_hall: 'concert',
  music_venue: 'concert',
}

const PRICE_MAP: Record<string, EventPrice> = {
  PRICE_LEVEL_FREE: 'free',
  PRICE_LEVEL_INEXPENSIVE: { min: 0, max: 15, currency: 'EUR' },
  PRICE_LEVEL_MODERATE: { min: 15, max: 35, currency: 'EUR' },
  PRICE_LEVEL_EXPENSIVE: { min: 35, max: 70, currency: 'EUR' },
  PRICE_LEVEL_VERY_EXPENSIVE: { min: 70, max: 200, currency: 'EUR' },
}

function mapCategory(types: string[]): EventCategory {
  for (const t of types) {
    const cat = TYPE_TO_CATEGORY[t]
    if (cat) return cat
  }
  return 'other'
}

export function normalizePlaceToEvent(place: GooglePlace, apiKey: string): Event {
  const photo = place.photos?.[0]
  const imageUrl = photo
    ? `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${apiKey}`
    : undefined

  return {
    id: `places_${place.id}`,
    title: place.displayName.text,
    description: place.formattedAddress,
    category: mapCategory(place.types),
    date: new Date().toISOString(),
    startTime: '',
    venue: {
      name: place.displayName.text,
      address: place.formattedAddress,
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    price: PRICE_MAP[place.priceLevel ?? ''] ?? 'free',
    imageUrl,
    ticketUrl: place.googleMapsUri,
    source: 'places',
  }
}

const FIELDS =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos,places.googleMapsUri,places.priceLevel'

export class PlacesSource implements EventSource {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    if (!query.q) return []

    const textQuery = `${query.q} ${query.city}`
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'it',
        regionCode: 'IT',
        maxResultCount: 20,
      }),
    })

    if (!res.ok) throw new Error(`Places API error: ${res.status}`)

    const data = await res.json()
    const places: GooglePlace[] = data.places ?? []

    let results = places.map((p) => normalizePlaceToEvent(p, this.apiKey))

    if (query.free) {
      results = results.filter((e) => e.price === 'free')
    }

    const categories = Array.isArray(query.category)
      ? query.category
      : query.category
      ? [query.category]
      : []
    if (categories.length > 0) {
      results = results.filter((e) => categories.includes(e.category))
    }

    return results
  }

  async fetchById(id: string): Promise<Event | null> {
    const placeId = id.replace('places_', '')
    const fields = 'id,displayName,formattedAddress,location,types,photos,googleMapsUri,priceLevel'
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${this.apiKey}`
    )
    if (!res.ok) return null
    const place: GooglePlace = await res.json()
    return normalizePlaceToEvent(place, this.apiKey)
  }
}
```

- [ ] **Step 4: Eseguire i test — devono passare**

```bash
npx jest __tests__/lib/sources/places.test.ts --no-coverage
```

Expected: 12/12 PASS

- [ ] **Step 5: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sources/places.ts __tests__/lib/sources/places.test.ts
git commit -m "feat: add PlacesSource with Google Places Text Search API"
```

---

## Task 3: Integrare PlacesSource in sources/index.ts

**Files:**
- Modify: `src/lib/sources/index.ts`
- Modify: `src/app/api/events/[id]/route.ts`
- Modify: `.env.local.example`

- [ ] **Step 1: Aggiornare sources/index.ts**

Sostituire il contenuto di `src/lib/sources/index.ts`:

```ts
import { cache } from 'react'
import type { Event, EventQuery } from '@/lib/types'
import { EventbriteSource } from './eventbrite'
import { MockSource } from './mock'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'

const eventSources = [
  new MockSource(),
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
  new EventbriteSource(process.env.EVENTBRITE_TOKEN ?? ''),
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

- [ ] **Step 2: Aggiungere GOOGLE_PLACES_API_KEY a .env.local.example**

In `.env.local.example` aggiungere:
```
GOOGLE_PLACES_API_KEY=your_google_maps_platform_api_key
```

**Nota:** l'utente deve aggiungere `GOOGLE_PLACES_API_KEY=AIzaSyBt1HADgf5YScrsae0uX0IspJHMxIgq3vE` (o il proprio key) in `.env.local`.

- [ ] **Step 3: Verificare TypeScript e test**

```bash
npx tsc --noEmit && npx jest --no-coverage
```

Expected: zero errori TS, tutti i test passano.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sources/index.ts .env.local.example
git commit -m "feat: route to PlacesSource when keyword q is present"
```

---

## Task 4: Componente KeywordSearch

**Files:**
- Create: `src/components/KeywordSearch.tsx`

- [ ] **Step 1: Creare KeywordSearch.tsx**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function KeywordSearch({ value, onChange, placeholder }: Props) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync quando value cambia dall'esterno (es. navigazione back/forward)
  useEffect(() => {
    setLocal(value)
  }, [value])

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

  return (
    <div className="relative flex items-center">
      {/* search icon */}
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
        placeholder={placeholder ?? 'Cerca tipo di locale... es. cocktail bar, discoteca jazz'}
        className="w-full pl-9 pr-8 py-2 rounded-xl bg-bg-card text-text text-sm
                   border border-white/10 focus:outline-none focus:border-accent
                   placeholder:text-text-muted"
      />

      {/* clear button */}
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
  )
}
```

- [ ] **Step 2: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output.

- [ ] **Step 3: Commit**

```bash
git add src/components/KeywordSearch.tsx
git commit -m "feat: add debounced KeywordSearch input component"
```

---

## Task 5: Aggiornare FilterBar con pill-scorciatoia keyword

**Files:**
- Modify: `src/components/FilterBar.tsx`

Le pill-scorciatoia impostano il campo `q` (keyword) invece di filtrare per categoria.
Quando una scorciatoia è attiva, i filtri categoria tradizionali sono nascosti (o disabilitati — si usano solo con eventi, non con Places).

- [ ] **Step 1: Aggiornare il tipo Filters e le Props**

Sostituire il contenuto di `src/components/FilterBar.tsx`:

```tsx
'use client'

type Filters = {
  date?: 'today' | 'weekend'
  q?: string     // keyword (imposta anche la scorciatoia attiva)
  free: boolean
}

type Props = {
  activeFilters: Filters
  onChange: (filters: Filters) => void
}

type DatePill = { label: string; kind: 'date'; value: 'today' | 'weekend' }
type FreePill = { label: string; kind: 'free' }
type KeywordPill = { label: string; kind: 'keyword'; value: string }
type PillConfig = DatePill | FreePill | KeywordPill

const DATE_PILLS: DatePill[] = [
  { label: 'Stasera', kind: 'date', value: 'today' },
  { label: 'Weekend', kind: 'date', value: 'weekend' },
]

const FREE_PILL: FreePill = { label: 'Gratis', kind: 'free' }

const KEYWORD_PILLS: KeywordPill[] = [
  { label: 'Discoteche', kind: 'keyword', value: 'discoteca nightclub' },
  { label: 'Bar & Aperitivo', kind: 'keyword', value: 'aperitivo bar' },
  { label: 'Live Music', kind: 'keyword', value: 'live music concerto' },
  { label: 'Teatro', kind: 'keyword', value: 'teatro' },
  { label: 'Cocktail Bar', kind: 'keyword', value: 'cocktail bar' },
  { label: 'Jazz', kind: 'keyword', value: 'jazz bar' },
]

const ALL_PILLS: PillConfig[] = [...DATE_PILLS, FREE_PILL, ...KEYWORD_PILLS]

export default function FilterBar({ activeFilters, onChange }: Props) {
  function isActive(pill: PillConfig): boolean {
    if (pill.kind === 'date') return activeFilters.date === pill.value
    if (pill.kind === 'free') return activeFilters.free
    return activeFilters.q === pill.value
  }

  function handleToggle(pill: PillConfig) {
    if (pill.kind === 'date') {
      onChange({
        ...activeFilters,
        date: activeFilters.date === pill.value ? undefined : pill.value,
      })
    } else if (pill.kind === 'free') {
      onChange({ ...activeFilters, free: !activeFilters.free })
    } else {
      // keyword shortcut: toggle on/off
      onChange({
        ...activeFilters,
        q: activeFilters.q === pill.value ? '' : pill.value,
      })
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {ALL_PILLS.map((pill) => (
        <button
          key={pill.label}
          onClick={() => handleToggle(pill)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isActive(pill)
              ? 'bg-accent text-white'
              : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}
```

**Nota:** Il tipo `Filters` di FilterBar ora non include `categories: EventCategory[]` — quella logica era per gli eventi, non per la ricerca Places. `CityPageClient` (step successivo) mantiene il tipo Filters allineato.

- [ ] **Step 2: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: add keyword shortcut pills to FilterBar"
```

---

## Task 6: Aggiornare CityPageClient

**Files:**
- Modify: `src/components/CityPageClient.tsx`

- [ ] **Step 1: Sostituire CityPageClient.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import KeywordSearch from '@/components/KeywordSearch'
import SplitView from '@/components/SplitView'
import { Event } from '@/lib/types'

type Filters = {
  date?: 'today' | 'weekend'
  q?: string
  free: boolean
}

type Props = {
  events: Event[]
  city: string
  initialFilters: Filters
}

export default function CityPageClient({ events, city, initialFilters }: Props) {
  const router = useRouter()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  function buildUrl(filters: Filters) {
    const sp = new URLSearchParams()
    if (filters.date) sp.set('date', filters.date)
    if (filters.q && filters.q.trim()) sp.set('q', filters.q.trim())
    if (filters.free) sp.set('free', 'true')
    const qs = sp.toString()
    return `/${encodeURIComponent(city)}${qs ? `?${qs}` : ''}`
  }

  function handleFilterChange(filters: Filters) {
    router.push(buildUrl(filters))
  }

  function handleKeyword(q: string) {
    router.push(buildUrl({ ...initialFilters, q }))
  }

  const isVenueMode = Boolean(initialFilters.q)
  const label = isVenueMode
    ? `${events.length} local${events.length === 1 ? 'e' : 'i'} a ${city}`
    : `${events.length} event${events.length === 1 ? 'o' : 'i'} a ${city}`

  return (
    <>
      {/* Keyword search */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        <KeywordSearch value={initialFilters.q ?? ''} onChange={handleKeyword} />
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-4 max-w-5xl mx-auto">
        <FilterBar activeFilters={initialFilters} onChange={handleFilterChange} />
      </div>

      {/* Results count */}
      <div className="px-4 pb-3 max-w-5xl mx-auto">
        <p className="text-text-muted text-sm">{label}</p>
      </div>

      {/* Split View */}
      <SplitView
        events={events}
        highlightedId={highlightedId}
        onCardHover={setHighlightedId}
        onPinClick={setHighlightedId}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output.

- [ ] **Step 3: Commit**

```bash
git add src/components/CityPageClient.tsx
git commit -m "feat: integrate KeywordSearch in CityPageClient, q in URL"
```

---

## Task 7: Aggiornare la City Page (server component)

**Files:**
- Modify: `src/app/[city]/page.tsx`

- [ ] **Step 1: Leggere `q` da searchParams e passarlo alla query**

In `src/app/[city]/page.tsx`, aggiornare il parsing di `searchParams`:

```ts
const sp = await searchParams

// esistenti
const date = sp.date === 'today' || sp.date === 'weekend' ? sp.date : undefined
const free = sp.free === 'true'

// keyword (nuovo)
const q = typeof sp.q === 'string' && sp.q.trim() ? sp.q.trim() : undefined

const query: EventQuery = { city, date, free }
if (q) query.q = q

// initialFilters per CityPageClient — rimuovere `categories` (non usate più)
const initialFilters = { date, free, q }
```

Assicurarsi che il componente `<CityPageClient>` riceva `initialFilters` con il nuovo tipo (senza `categories`).

Il `<CityPageClient>` si aspetta:
```ts
type Props = {
  events: Event[]
  city: string
  initialFilters: { date?: 'today' | 'weekend'; q?: string; free: boolean }
}
```

- [ ] **Step 2: Verificare TypeScript**

```bash
npx tsc --noEmit
```

Expected: nessun output.

- [ ] **Step 3: Test completo**

```bash
npx jest --no-coverage
```

Expected: tutti i test passano.

- [ ] **Step 4: Commit**

```bash
git add src/app/[city]/page.tsx
git commit -m "feat: pass keyword q from searchParams to EventQuery in city page"
```

---

## Task 8: Aggiornere .env.local con GOOGLE_PLACES_API_KEY

**Files:**
- Modify: `.env.local` (non committato, solo istruzione)

- [ ] **Step 1: Aggiungere la chiave a .env.local**

Il file `.env.local` deve contenere:
```
GOOGLE_PLACES_API_KEY=AIzaSyBt1HADgf5YScrsae0uX0IspJHMxIgq3vE
```

Aggiungere questa riga al file (la chiave è quella Maps Platform dell'utente).

- [ ] **Step 2: Riavviare il dev server**

Le variabili d'ambiente server-side (senza `NEXT_PUBLIC_`) richiedono riavvio del server:

```bash
# Fermare il server esistente (Ctrl+C) poi:
npx next dev --port 3001
```

- [ ] **Step 3: Test manuale**

Aprire http://localhost:3001/Milano e:
1. Digitare "cocktail bar" → attesa 500ms → la griglia mostra locali reali da Google Places
2. Cliccare pill "Discoteche" → mostra discoteche milanesi sulla mappa
3. Cliccare "Stasera" → si combina con la ricerca corrente
4. Cancellare la keyword → torna agli eventi Ticketmaster/Mock

- [ ] **Step 4: Commit finale**

```bash
git add .env.local.example
git commit -m "feat: complete Google Places keyword search integration"
```
