# Serata — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire un sito Next.js 15 per scoprire eventi nightlife e cultura nella propria città, aggregati da Eventbrite API, visualizzati in griglia dark + mappa split.

**Architecture:** Next.js App Router con route API server-side che fa da proxy verso Eventbrite (protegge la API key). Il frontend riceve eventi in un formato `Event` normalizzato; aggiungere nuove fonti significa implementare l'interfaccia `EventSource` senza toccare il frontend. La mappa (Leaflet/OSM) è client-only, caricata con `dynamic(..., { ssr: false })`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Leaflet + OpenStreetMap, Eventbrite API v3, Jest + React Testing Library.

---

## File Map

```
.
├── .env.local.example               # template variabili d'ambiente
├── jest.config.ts                   # config Jest per Next.js
├── jest.setup.ts                    # setup @testing-library/jest-dom
├── src/
│   ├── app/
│   │   ├── globals.css              # dark theme + import Leaflet CSS
│   │   ├── layout.tsx               # root layout (font, metadata)
│   │   ├── page.tsx                 # homepage: CitySearch + eventi in evidenza
│   │   ├── [city]/
│   │   │   ├── page.tsx             # pagina città: SplitView (EventGrid + EventMap)
│   │   │   └── [id]/
│   │   │       └── page.tsx         # dettaglio evento
│   │   └── api/
│   │       └── events/
│   │           ├── route.ts         # GET /api/events?city=&category=&date=&free=
│   │           └── [id]/
│   │               └── route.ts     # GET /api/events/[id]
│   ├── lib/
│   │   ├── types.ts                 # Event type + EventSource interface
│   │   └── sources/
│   │       ├── index.ts             # aggrega tutte le fonti
│   │       └── eventbrite.ts        # EventbriteSource
│   └── components/
│       ├── CitySearch.tsx           # input città con submit
│       ├── FilterBar.tsx            # pill di filtro (categoria, data, gratis)
│       ├── EventCard.tsx            # card evento con foto, badge, prezzo
│       ├── EventGrid.tsx            # griglia responsiva di EventCard
│       ├── EventMap.tsx             # Leaflet map, client-only
│       └── SplitView.tsx            # desktop: grid+map affiancati; mobile: toggle
└── __tests__/
    ├── lib/sources/eventbrite.test.ts
    └── components/
        ├── EventCard.test.tsx
        ├── CitySearch.test.tsx
        └── FilterBar.test.tsx
```

---

## Prerequisito: Eventbrite API key

Prima di iniziare, ottieni una private token Eventbrite:
1. Crea account su [eventbrite.com](https://www.eventbrite.com)
2. Vai su https://www.eventbrite.com/platform/api-keys
3. Crea una nuova app e copia il **Private Token**
4. Aggiungilo a `.env.local` come `EVENTBRITE_TOKEN=il_tuo_token`

---

## Task 1: Scaffold del progetto

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Crea il progetto Next.js**

```bash
cd "C:/Magi/dev/3. serata"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

Rispondere `No` a Turbopack se chiede (o lasciare default).

- [ ] **Step 2: Installa dipendenze aggiuntive**

```bash
npm install leaflet
npm install --save-dev @types/leaflet jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Crea `jest.config.ts`**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^leaflet$': '<rootDir>/__mocks__/leaflet.ts',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 4: Crea `jest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Crea il mock di Leaflet per i test**

Crea `__mocks__/leaflet.ts`:

```ts
const L = {
  map: () => ({
    setView: () => ({ on: () => {} }),
    remove: () => {},
  }),
  tileLayer: () => ({ addTo: () => {} }),
  circleMarker: () => ({
    addTo: () => ({ bindPopup: () => ({ on: () => {} }) }),
    remove: () => {},
    setStyle: () => {},
  }),
}
export default L
```

- [ ] **Step 6: Crea `.env.local.example`**

```
EVENTBRITE_TOKEN=your_private_token_here
```

Poi crea `.env.local` reale con il tuo token.

- [ ] **Step 7: Verifica che i test girino**

```bash
npx jest --passWithNoTests
```

Output atteso: `Test Suites: 0 passed`

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 project with Jest and Leaflet mock"
```

---

## Task 2: Tipi condivisi e interfaccia EventSource

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Crea `src/lib/types.ts`**

```ts
export type EventCategory = 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'

export type EventPrice =
  | 'free'
  | { min: number; max: number; currency: string }

export type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string       // ISO 8601 UTC
  startTime: string  // "23:00" locale
  endTime?: string   // "04:00" locale
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

export type EventQuery = {
  city: string
  category?: EventCategory | EventCategory[]
  date?: 'today' | 'weekend'
  free?: boolean
}

export interface EventSource {
  fetch(query: EventQuery): Promise<Event[]>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Event type and EventSource interface"
```

---

## Task 3: Eventbrite source

**Files:**
- Create: `src/lib/sources/eventbrite.ts`
- Create: `src/lib/sources/index.ts`
- Test: `__tests__/lib/sources/eventbrite.test.ts`

- [ ] **Step 1: Scrivi il test fallente per `normalizeEvent`**

Crea `__tests__/lib/sources/eventbrite.test.ts`:

```ts
import { normalizeEvent } from '@/lib/sources/eventbrite'

const RAW_EVENT = {
  id: '123',
  name: { text: 'Notte Latina' },
  description: { text: 'Una serata di ritmi latini.' },
  start: { utc: '2026-04-25T21:00:00Z', local: '2026-04-25T23:00:00' },
  end: { utc: '2026-04-26T02:00:00Z', local: '2026-04-26T04:00:00' },
  is_free: false,
  ticket_availability: {
    minimum_ticket_price: { value: 15, currency: 'EUR' },
  },
  logo: { url: 'https://example.com/img.jpg' },
  url: 'https://eventbrite.com/e/123',
  category_id: '113',
  venue: {
    name: 'Fabric Milano',
    address: { localized_address_display: 'Via Fabio Filzi 34, Milano' },
    latitude: '45.4654',
    longitude: '9.1859',
  },
}

describe('normalizeEvent', () => {
  it('maps category_id 113 to club', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.category).toBe('club')
  })

  it('extracts startTime from local datetime', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.startTime).toBe('23:00')
  })

  it('parses price correctly', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.price).toEqual({ min: 15, max: 15, currency: 'EUR' })
  })

  it('maps free event to "free"', () => {
    const event = normalizeEvent({ ...RAW_EVENT, is_free: true })
    expect(event.price).toBe('free')
  })

  it('parses venue coordinates', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.venue.lat).toBe(45.4654)
    expect(event.venue.lng).toBe(9.1859)
  })

  it('falls back to "other" for unknown category', () => {
    const event = normalizeEvent({ ...RAW_EVENT, category_id: '999' })
    expect(event.category).toBe('other')
  })
})
```

- [ ] **Step 2: Esegui il test per verificare che fallisce**

```bash
npx jest eventbrite.test.ts
```

Output atteso: `FAIL` — `Cannot find module '@/lib/sources/eventbrite'`

- [ ] **Step 3: Implementa `src/lib/sources/eventbrite.ts`**

```ts
import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

const CATEGORY_MAP: Record<string, EventCategory> = {
  '113': 'club',
  '103': 'concert',
  '105': 'theatre',
  '110': 'aperitivo',
}

const CATEGORY_TO_EB_ID: Record<string, string> = {
  club: '113',
  concert: '103',
  theatre: '105',
  aperitivo: '110',
}

type EbEvent = {
  id: string
  name: { text: string }
  description?: { text: string }
  start: { utc: string; local: string }
  end?: { utc: string; local: string }
  is_free: boolean
  ticket_availability?: {
    minimum_ticket_price?: { value: number; currency: string }
  }
  logo?: { url: string }
  url: string
  category_id?: string
  venue?: {
    name: string
    address?: { localized_address_display: string }
    latitude?: string
    longitude?: string
  }
}

export function normalizeEvent(raw: EbEvent): Event {
  return {
    id: raw.id,
    title: raw.name.text,
    description: raw.description?.text ?? '',
    category: CATEGORY_MAP[raw.category_id ?? ''] ?? 'other',
    date: raw.start.utc,
    startTime: raw.start.local.slice(11, 16),
    endTime: raw.end?.local.slice(11, 16),
    venue: {
      name: raw.venue?.name ?? '',
      address: raw.venue?.address?.localized_address_display ?? '',
      lat: parseFloat(raw.venue?.latitude ?? '0'),
      lng: parseFloat(raw.venue?.longitude ?? '0'),
    },
    price: raw.is_free
      ? 'free'
      : {
          min: raw.ticket_availability?.minimum_ticket_price?.value ?? 0,
          max: raw.ticket_availability?.minimum_ticket_price?.value ?? 0,
          currency: raw.ticket_availability?.minimum_ticket_price?.currency ?? 'EUR',
        },
    imageUrl: raw.logo?.url,
    ticketUrl: raw.url,
    source: 'eventbrite',
  }
}

function getDateRange(date: 'today' | 'weekend'): { start: string; end?: string } {
  const now = new Date()
  if (date === 'today') {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { start: now.toISOString(), end: end.toISOString() }
  }
  const day = now.getDay()
  const daysToSat = day === 0 ? 6 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  return { start: sat.toISOString(), end: sun.toISOString() }
}

export class EventbriteSource implements EventSource {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    const params = new URLSearchParams({
      'location.address': query.city,
      'location.within': '50km',
      expand: 'venue,logo,ticket_availability',
    })

    const categories = Array.isArray(query.category)
      ? query.category
      : query.category
      ? [query.category]
      : []
    if (categories.length > 0) {
      const ids = categories
        .map(c => CATEGORY_TO_EB_ID[c])
        .filter(Boolean)
        .join(',')
      if (ids) params.set('categories', ids)
    }

    if (query.free) params.set('price', 'free')

    if (query.date) {
      const range = getDateRange(query.date)
      params.set('start_date.range_start', range.start)
      if (range.end) params.set('start_date.range_end', range.end)
    }

    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )

    if (!res.ok) throw new Error(`Eventbrite error: ${res.status}`)

    const data = await res.json()
    return (data.events ?? []).map(normalizeEvent)
  }

  async fetchById(id: string): Promise<Event> {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/${id}/?expand=venue,logo,ticket_availability`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    if (!res.ok) throw new Error(`Eventbrite error: ${res.status}`)
    const data = await res.json()
    return normalizeEvent(data)
  }
}
```

- [ ] **Step 4: Crea `src/lib/sources/index.ts`**

```ts
import type { Event, EventQuery } from '@/lib/types'
import { EventbriteSource } from './eventbrite'

const sources = [
  new EventbriteSource(process.env.EVENTBRITE_TOKEN ?? ''),
]

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  const results = await Promise.allSettled(sources.map(s => s.fetch(query)))
  return results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}

export async function fetchEventById(id: string): Promise<Event | null> {
  const eb = new EventbriteSource(process.env.EVENTBRITE_TOKEN ?? '')
  try {
    return await eb.fetchById(id)
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Esegui i test**

```bash
npx jest eventbrite.test.ts
```

Output atteso: `PASS — 6 tests passed`

- [ ] **Step 6: Commit**

```bash
git add src/lib/ __tests__/lib/
git commit -m "feat: add Eventbrite source with normalization and EventSource interface"
```

---

## Task 4: Route API — lista eventi e dettaglio

**Files:**
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/events/[id]/route.ts`

- [ ] **Step 1: Crea `src/app/api/events/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/sources'
import type { EventCategory } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const city = searchParams.get('city')
  if (!city) {
    return NextResponse.json({ error: 'city is required' }, { status: 400 })
  }

  const categoryParam = searchParams.get('category')
  const categories = categoryParam
    ? (categoryParam.split(',') as EventCategory[])
    : undefined

  const date = searchParams.get('date') as 'today' | 'weekend' | null
  const free = searchParams.get('free') === 'true'

  try {
    const events = await fetchEvents({
      city,
      category: categories,
      date: date ?? undefined,
      free: free || undefined,
    })
    return NextResponse.json({ events })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Crea `src/app/api/events/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchEventById } from '@/lib/sources'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const event = await fetchEventById(id)
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  return NextResponse.json({ event })
}
```

- [ ] **Step 3: Avvia il dev server e verifica manualmente**

```bash
npm run dev
```

Apri nel browser (sostituisci con la tua città):
```
http://localhost:3000/api/events?city=Milano
```

Risposta attesa: `{ "events": [...] }` — array di eventi Eventbrite normalizzati.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add /api/events proxy route for Eventbrite"
```

---

## Task 5: Layout root e tema dark

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Aggiorna `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg: #0d0d1a;
  --card: #1a1a2e;
  --accent: #e94560;
  --text: #f0f0f0;
  --muted: #888;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```

- [ ] **Step 2: Aggiorna `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Serata — Cosa succede stasera?',
  description: 'Serate, concerti e cultura nella tua zona',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={geist.className}>
      <body className="min-h-screen bg-[#0d0d1a] text-[#f0f0f0] antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verifica visiva**

Con `npm run dev` aperto, vai su `http://localhost:3000` — lo sfondo deve essere quasi nero (`#0d0d1a`).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: dark theme layout"
```

---

## Task 6: Componente EventCard

**Files:**
- Create: `src/components/EventCard.tsx`
- Test: `__tests__/components/EventCard.test.tsx`

- [ ] **Step 1: Scrivi il test fallente**

Crea `__tests__/components/EventCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import EventCard from '@/components/EventCard'
import type { Event } from '@/lib/types'

const MOCK_EVENT: Event = {
  id: '1',
  title: 'Notte Latina',
  description: 'Una serata di ritmi latini.',
  category: 'club',
  date: '2026-04-25T21:00:00Z',
  startTime: '23:00',
  venue: { name: 'Fabric', address: 'Via Fabio Filzi 34', lat: 45.4, lng: 9.1 },
  price: { min: 15, max: 15, currency: 'EUR' },
  ticketUrl: 'https://eventbrite.com/e/1',
  source: 'eventbrite',
}

describe('EventCard', () => {
  it('renders the event title', () => {
    render(<EventCard event={MOCK_EVENT} />)
    expect(screen.getByText('Notte Latina')).toBeInTheDocument()
  })

  it('renders the start time', () => {
    render(<EventCard event={MOCK_EVENT} />)
    expect(screen.getByText(/23:00/)).toBeInTheDocument()
  })

  it('renders the price', () => {
    render(<EventCard event={MOCK_EVENT} />)
    expect(screen.getByText(/€15/)).toBeInTheDocument()
  })

  it('renders "Gratis" for free events', () => {
    render(<EventCard event={{ ...MOCK_EVENT, price: 'free' }} />)
    expect(screen.getByText('Gratis')).toBeInTheDocument()
  })

  it('renders the category badge', () => {
    render(<EventCard event={MOCK_EVENT} />)
    expect(screen.getByText('CLUB')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui per verificare che fallisce**

```bash
npx jest EventCard.test.tsx
```

Output atteso: `FAIL` — `Cannot find module '@/components/EventCard'`

- [ ] **Step 3: Implementa `src/components/EventCard.tsx`**

```tsx
import Link from 'next/link'
import type { Event } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  club:       'bg-[#e94560]',
  concert:    'bg-[#a29bfe]',
  theatre:    'bg-[#fdcb6e] text-black',
  aperitivo:  'bg-[#00b894]',
  other:      'bg-[#555]',
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  club:      'from-[#e94560] to-[#533483]',
  concert:   'from-[#a29bfe] to-[#6c5ce7]',
  theatre:   'from-[#fdcb6e] to-[#e17055]',
  aperitivo: 'from-[#00b894] to-[#00cec9]',
  other:     'from-[#555] to-[#333]',
}

function formatPrice(price: Event['price']): string {
  if (price === 'free') return 'Gratis'
  return `€${price.min}`
}

function formatDate(isoDate: string, startTime: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + startTime
}

type Props = {
  event: Event
  highlighted?: boolean
  onHover?: (id: string | null) => void
}

export default function EventCard({ event, highlighted, onHover }: Props) {
  const gradient = CATEGORY_GRADIENTS[event.category] ?? CATEGORY_GRADIENTS.other
  const badgeColor = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other
  const price = formatPrice(event.price)
  const priceColor = event.price === 'free' ? 'text-[#00b894]' : 'text-[#e94560]'

  return (
    <Link
      href={`/${encodeURIComponent(event.venue.address.split(',').pop()?.trim() ?? 'events')}/${event.id}`}
      className={`block bg-[#1a1a2e] rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${highlighted ? 'ring-2 ring-[#e94560]' : ''}`}
      onMouseEnter={() => onHover?.(event.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={`h-32 bg-gradient-to-br ${gradient} relative flex items-end p-2`}>
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <span className={`relative text-xs font-bold px-2 py-0.5 rounded-full text-white ${badgeColor}`}>
          {event.category.toUpperCase()}
        </span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-xs text-[#888] mb-1">{formatDate(event.date, event.startTime)}</p>
        <p className={`text-sm font-semibold ${priceColor}`}>{price}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Esegui i test**

```bash
npx jest EventCard.test.tsx
```

Output atteso: `PASS — 5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/EventCard.tsx __tests__/components/EventCard.test.tsx
git commit -m "feat: add EventCard component"
```

---

## Task 7: Componente FilterBar

**Files:**
- Create: `src/components/FilterBar.tsx`
- Test: `__tests__/components/FilterBar.test.tsx`

- [ ] **Step 1: Scrivi il test fallente**

Crea `__tests__/components/FilterBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterBar from '@/components/FilterBar'

describe('FilterBar', () => {
  it('renders all filter pills', () => {
    render(<FilterBar activeFilters={{}} onChange={() => {}} />)
    expect(screen.getByText('Stasera')).toBeInTheDocument()
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.getByText('Club')).toBeInTheDocument()
    expect(screen.getByText('Concerti')).toBeInTheDocument()
  })

  it('calls onChange with date=today when clicking Stasera', async () => {
    const onChange = jest.fn()
    render(<FilterBar activeFilters={{}} onChange={onChange} />)
    await userEvent.click(screen.getByText('Stasera'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ date: 'today' }))
  })

  it('applies active style to active filter', () => {
    render(<FilterBar activeFilters={{ date: 'today' }} onChange={() => {}} />)
    const pill = screen.getByText('Stasera').closest('button')
    expect(pill).toHaveClass('bg-[#e94560]')
  })
})
```

- [ ] **Step 2: Esegui per verificare che fallisce**

```bash
npx jest FilterBar.test.tsx
```

Output atteso: `FAIL` — `Cannot find module '@/components/FilterBar'`

- [ ] **Step 3: Implementa `src/components/FilterBar.tsx`**

```tsx
'use client'

type Filters = {
  date?: 'today' | 'weekend'
  category?: string
  free?: boolean
}

type FilterOption = {
  id: string
  label: string
  apply: (f: Filters) => Filters
  isActive: (f: Filters) => boolean
}

const OPTIONS: FilterOption[] = [
  {
    id: 'today',
    label: 'Stasera',
    apply: f => ({ ...f, date: f.date === 'today' ? undefined : 'today' }),
    isActive: f => f.date === 'today',
  },
  {
    id: 'weekend',
    label: 'Weekend',
    apply: f => ({ ...f, date: f.date === 'weekend' ? undefined : 'weekend' }),
    isActive: f => f.date === 'weekend',
  },
  {
    id: 'free',
    label: 'Gratis',
    apply: f => ({ ...f, free: !f.free }),
    isActive: f => !!f.free,
  },
  {
    id: 'club',
    label: 'Club',
    apply: f => ({ ...f, category: f.category === 'club' ? undefined : 'club' }),
    isActive: f => f.category === 'club',
  },
  {
    id: 'concert',
    label: 'Concerti',
    apply: f => ({ ...f, category: f.category === 'concert' ? undefined : 'concert' }),
    isActive: f => f.category === 'concert',
  },
  {
    id: 'theatre',
    label: 'Teatro',
    apply: f => ({ ...f, category: f.category === 'theatre' ? undefined : 'theatre' }),
    isActive: f => f.category === 'theatre',
  },
  {
    id: 'aperitivo',
    label: 'Aperitivo',
    apply: f => ({ ...f, category: f.category === 'aperitivo' ? undefined : 'aperitivo' }),
    isActive: f => f.category === 'aperitivo',
  },
]

type Props = {
  activeFilters: Filters
  onChange: (filters: Filters) => void
}

export default function FilterBar({ activeFilters, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.apply(activeFilters))}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            opt.isActive(activeFilters)
              ? 'bg-[#e94560] text-white'
              : 'bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Esegui i test**

```bash
npx jest FilterBar.test.tsx
```

Output atteso: `PASS — 3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.tsx __tests__/components/FilterBar.test.tsx
git commit -m "feat: add FilterBar component with toggle pills"
```

---

## Task 8: Componente CitySearch

**Files:**
- Create: `src/components/CitySearch.tsx`
- Test: `__tests__/components/CitySearch.test.tsx`

- [ ] **Step 1: Scrivi il test fallente**

Crea `__tests__/components/CitySearch.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CitySearch from '@/components/CitySearch'

describe('CitySearch', () => {
  it('renders the input field', () => {
    render(<CitySearch onSearch={() => {}} />)
    expect(screen.getByPlaceholderText(/città/i)).toBeInTheDocument()
  })

  it('calls onSearch with the typed city on submit', async () => {
    const onSearch = jest.fn()
    render(<CitySearch onSearch={onSearch} />)
    await userEvent.type(screen.getByPlaceholderText(/città/i), 'Milano')
    await userEvent.keyboard('{Enter}')
    expect(onSearch).toHaveBeenCalledWith('Milano')
  })

  it('does not call onSearch when input is empty', async () => {
    const onSearch = jest.fn()
    render(<CitySearch onSearch={onSearch} />)
    await userEvent.keyboard('{Enter}')
    expect(onSearch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui per verificare che fallisce**

```bash
npx jest CitySearch.test.tsx
```

Output atteso: `FAIL` — `Cannot find module '@/components/CitySearch'`

- [ ] **Step 3: Implementa `src/components/CitySearch.tsx`**

```tsx
'use client'
import { useState, type FormEvent } from 'react'

type Props = {
  onSearch: (city: string) => void
  defaultValue?: string
}

export default function CitySearch({ onSearch, defaultValue = '' }: Props) {
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
      <div className="flex-1 flex items-center gap-2 bg-[#ffffff15] border border-[#ffffff25] rounded-xl px-4 py-3 focus-within:border-[#e94560] transition-colors">
        <span className="text-base">📍</span>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Inserisci la tua città..."
          className="flex-1 bg-transparent text-white placeholder-[#888] text-sm outline-none"
        />
      </div>
      <button
        type="submit"
        className="bg-[#e94560] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#c73350] transition-colors"
      >
        Cerca
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Esegui i test**

```bash
npx jest CitySearch.test.tsx
```

Output atteso: `PASS — 3 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/CitySearch.tsx __tests__/components/CitySearch.test.tsx
git commit -m "feat: add CitySearch component"
```

---

## Task 9: Componente EventGrid

**Files:**
- Create: `src/components/EventGrid.tsx`

- [ ] **Step 1: Implementa `src/components/EventGrid.tsx`**

```tsx
import EventCard from './EventCard'
import type { Event } from '@/lib/types'

type Props = {
  events: Event[]
  highlightId?: string
  onHover?: (id: string | null) => void
}

export default function EventGrid({ events, highlightId, onHover }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#888]">
        <span className="text-4xl mb-4">🎭</span>
        <p className="text-sm">Nessun evento trovato per questa ricerca.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {events.map(event => (
        <EventCard
          key={event.id}
          event={event}
          highlighted={event.id === highlightId}
          onHover={onHover}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EventGrid.tsx
git commit -m "feat: add EventGrid component"
```

---

## Task 10: Componente EventMap (client-only, Leaflet)

**Files:**
- Create: `src/components/EventMap.tsx`

- [ ] **Step 1: Implementa `src/components/EventMap.tsx`**

```tsx
'use client'
import { useEffect, useRef } from 'react'
import type { Event } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  club:      '#e94560',
  concert:   '#a29bfe',
  theatre:   '#fdcb6e',
  aperitivo: '#00b894',
  other:     '#888888',
}

type Props = {
  events: Event[]
  highlightId?: string
  onPinClick?: (id: string) => void
  center?: [number, number]
}

export default function EventMap({ events, highlightId, onPinClick, center }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<Map<string, import('leaflet').CircleMarker>>(new Map())

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      import('leaflet/dist/leaflet.css')
      const defaultCenter = center ?? [41.9028, 12.4964] // Roma fallback
      const map = L.map(containerRef.current!).setView(defaultCenter, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map)
      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    import('leaflet').then(L => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      events.forEach(event => {
        if (!event.venue.lat || !event.venue.lng) return
        const color = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other
        const marker = L.circleMarker([event.venue.lat, event.venue.lng], {
          radius: 9,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(
            `<div style="font-weight:bold">${event.title}</div><div style="font-size:12px">${event.venue.name}</div>`
          )

        marker.on('click', () => onPinClick?.(event.id))
        markersRef.current.set(event.id, marker)
      })

      const eventsWithCoords = events.filter(e => e.venue.lat && e.venue.lng)
      if (eventsWithCoords.length > 0) {
        const bounds = L.latLngBounds(
          eventsWithCoords.map(e => [e.venue.lat, e.venue.lng])
        )
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })
  }, [events, onPinClick])

  useEffect(() => {
    import('leaflet').then(() => {
      markersRef.current.forEach((marker, id) => {
        marker.setStyle(
          id === highlightId
            ? { radius: 14, weight: 3 }
            : { radius: 9, weight: 2 }
        )
      })
    })
  }, [highlightId])

  return <div ref={containerRef} className="h-full w-full rounded-xl overflow-hidden" />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EventMap.tsx
git commit -m "feat: add EventMap component with Leaflet (client-only)"
```

---

## Task 11: Componente SplitView

**Files:**
- Create: `src/components/SplitView.tsx`

- [ ] **Step 1: Implementa `src/components/SplitView.tsx`**

```tsx
'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import EventGrid from './EventGrid'
import type { Event } from '@/lib/types'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  events: Event[]
  cityCenter?: [number, number]
}

export default function SplitView({ events, cityCenter }: Props) {
  const [activeView, setActiveView] = useState<'grid' | 'map'>('grid')
  const [highlightId, setHighlightId] = useState<string | undefined>()

  const handleHover = useCallback((id: string | null) => {
    setHighlightId(id ?? undefined)
  }, [])

  const handlePinClick = useCallback((id: string) => {
    setHighlightId(id)
    const el = document.getElementById(`event-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Mobile toggle */}
      <div className="flex md:hidden bg-[#1a1a2e] rounded-full p-1 self-start">
        <button
          onClick={() => setActiveView('grid')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeView === 'grid' ? 'bg-[#e94560] text-white' : 'text-[#888]'
          }`}
        >
          ≡ Lista
        </button>
        <button
          onClick={() => setActiveView('map')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeView === 'map' ? 'bg-[#e94560] text-white' : 'text-[#888]'
          }`}
        >
          🗺 Mappa
        </button>
      </div>

      {/* Grid — nascosta su mobile se activeView è map */}
      <div
        id="event-grid"
        className={`md:flex-1 md:overflow-y-auto md:pr-2 ${
          activeView === 'map' ? 'hidden md:block' : ''
        }`}
      >
        <EventGrid
          events={events}
          highlightId={highlightId}
          onHover={handleHover}
        />
      </div>

      {/* Map — sticky su desktop, nascosta su mobile se activeView è grid */}
      <div
        className={`md:w-[45%] md:sticky md:top-4 md:h-[calc(100vh-8rem)] rounded-xl overflow-hidden ${
          activeView === 'grid' ? 'hidden md:block' : 'h-[60vh]'
        }`}
      >
        <EventMap
          events={events}
          highlightId={highlightId}
          onPinClick={handlePinClick}
          center={cityCenter}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SplitView.tsx
git commit -m "feat: add SplitView with desktop split and mobile toggle"
```

---

## Task 12: Homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implementa `src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import CitySearch from '@/components/CitySearch'
import EventCard from '@/components/EventCard'
import { fetchEvents } from '@/lib/sources'

async function getFeaturedEvents() {
  try {
    return await fetchEvents({ city: 'Milano', date: 'today' })
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featured = await getFeaturedEvents()

  async function handleSearch(city: string) {
    'use server'
    redirect(`/${encodeURIComponent(city.toLowerCase())}`)
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <header className="mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-[#888] mb-2">Serata</p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 leading-tight">
          Cosa succede<br />stasera?
        </h1>
        <p className="text-[#888] mb-8">Serate, concerti e cultura nella tua zona</p>
        <CitySearch onSearch={handleSearch} />
      </header>

      {featured.length > 0 && (
        <section>
          <h2 className="text-xs tracking-[0.15em] uppercase text-[#888] mb-4">In evidenza</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured.slice(0, 8).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verifica visiva**

Vai su `http://localhost:3000` — deve apparire:
- Titolo "Cosa succede stasera?"
- Input di ricerca città
- (Se Eventbrite restituisce dati) card eventi in evidenza

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add homepage with city search and featured events"
```

---

## Task 13: Pagina città

**Files:**
- Create: `src/app/[city]/page.tsx`

- [ ] **Step 1: Implementa `src/app/[city]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { fetchEvents } from '@/lib/sources'
import FilterBar from '@/components/FilterBar'
import SplitView from '@/components/SplitView'
import CitySearch from '@/components/CitySearch'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ city: string }>
  searchParams: Promise<{ category?: string; date?: string; free?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const name = decodeURIComponent(city)
  return {
    title: `Serata a ${name} — Cosa succede stasera?`,
  }
}

export default async function CityPage({ params, searchParams }: PageProps) {
  const { city } = await params
  const sp = await searchParams
  const cityName = decodeURIComponent(city)

  const events = await fetchEvents({
    city: cityName,
    category: sp.category as any,
    date: sp.date as 'today' | 'weekend' | undefined,
    free: sp.free === 'true',
  })

  const activeFilters = {
    category: sp.category,
    date: sp.date as 'today' | 'weekend' | undefined,
    free: sp.free === 'true',
  }

  async function handleSearch(newCity: string) {
    'use server'
    redirect(`/${encodeURIComponent(newCity.toLowerCase())}`)
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-7xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#888] mb-1">Serata</p>
          <h1 className="text-2xl font-black text-white">{cityName}</h1>
          <p className="text-xs text-[#888]">{events.length} eventi trovati</p>
        </div>
        <div className="sm:ml-auto">
          <CitySearch onSearch={handleSearch} defaultValue={cityName} />
        </div>
      </header>

      <FilterBar activeFilters={activeFilters} onChange={() => {}} />

      <div className="flex-1">
        <SplitView events={events} />
      </div>
    </main>
  )
}
```

**Nota:** `FilterBar.onChange` richiede navigazione client-side. Aggiorna `src/app/[city]/page.tsx` per rendere il wrapper client che gestisce i filtri via `useRouter`:

Crea un wrapper client `src/app/[city]/CityPageClient.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import SplitView from '@/components/SplitView'
import type { Event } from '@/lib/types'

type Filters = { category?: string; date?: 'today' | 'weekend'; free?: boolean }

type Props = {
  events: Event[]
  city: string
  activeFilters: Filters
}

export default function CityPageClient({ events, city, activeFilters }: Props) {
  const router = useRouter()

  function handleFilterChange(filters: Filters) {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.date) params.set('date', filters.date)
    if (filters.free) params.set('free', 'true')
    router.push(`/${city}${params.size > 0 ? '?' + params : ''}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterBar activeFilters={activeFilters} onChange={handleFilterChange} />
      <SplitView events={events} />
    </div>
  )
}
```

E aggiorna `src/app/[city]/page.tsx` per usare il client wrapper:

```tsx
import type { Metadata } from 'next'
import { fetchEvents } from '@/lib/sources'
import CitySearch from '@/components/CitySearch'
import CityPageClient from './CityPageClient'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ city: string }>
  searchParams: Promise<{ category?: string; date?: string; free?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  return { title: `Serata a ${decodeURIComponent(city)} — Cosa succede stasera?` }
}

export default async function CityPage({ params, searchParams }: PageProps) {
  const { city } = await params
  const sp = await searchParams
  const cityName = decodeURIComponent(city)

  const events = await fetchEvents({
    city: cityName,
    category: sp.category as any,
    date: sp.date as 'today' | 'weekend' | undefined,
    free: sp.free === 'true',
  })

  const activeFilters = {
    category: sp.category,
    date: sp.date as 'today' | 'weekend' | undefined,
    free: sp.free === 'true',
  }

  async function handleSearch(newCity: string) {
    'use server'
    redirect(`/${encodeURIComponent(newCity.toLowerCase())}`)
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-7xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#888] mb-1">Serata</p>
          <h1 className="text-2xl font-black text-white">{cityName}</h1>
          <p className="text-xs text-[#888]">{events.length} eventi trovati</p>
        </div>
        <div className="sm:ml-auto">
          <CitySearch onSearch={handleSearch} defaultValue={cityName} />
        </div>
      </header>
      <CityPageClient events={events} city={city} activeFilters={activeFilters} />
    </main>
  )
}
```

- [ ] **Step 2: Verifica visiva**

Vai su `http://localhost:3000` → cerca "Milano" → deve aprire `/milano` con la griglia + mappa split.

- [ ] **Step 3: Commit**

```bash
git add src/app/[city]/
git commit -m "feat: add city page with SplitView and FilterBar"
```

---

## Task 14: Pagina dettaglio evento

**Files:**
- Create: `src/app/[city]/[id]/page.tsx`

- [ ] **Step 1: Crea `src/app/[city]/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { fetchEventById } from '@/lib/sources'
import type { Event } from '@/lib/types'

const MiniMap = dynamic(() => import('@/components/EventMap'), { ssr: false })

type PageProps = {
  params: Promise<{ city: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await fetchEventById(id)
  if (!event) return { title: 'Evento non trovato — Serata' }
  return {
    title: `${event.title} — Serata`,
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 160),
      images: event.imageUrl ? [{ url: event.imageUrl }] : [],
    },
  }
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  club:      'from-[#e94560] to-[#533483]',
  concert:   'from-[#a29bfe] to-[#6c5ce7]',
  theatre:   'from-[#fdcb6e] to-[#e17055]',
  aperitivo: 'from-[#00b894] to-[#00cec9]',
  other:     'from-[#555] to-[#333]',
}

function formatPrice(price: Event['price']): string {
  if (price === 'free') return 'Gratis'
  return `€${price.min}${price.max !== price.min ? `–€${price.max}` : ''}`
}

function formatFullDate(isoDate: string, startTime: string, endTime?: string): string {
  const date = new Date(isoDate)
  const day = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${day} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

export default async function EventDetailPage({ params }: PageProps) {
  const { city, id } = await params
  const event = await fetchEventById(id)
  if (!event) notFound()

  const gradient = CATEGORY_GRADIENTS[event.category] ?? CATEGORY_GRADIENTS.other

  return (
    <main className="min-h-screen max-w-2xl mx-auto">
      {/* Hero */}
      <div className={`relative h-64 md:h-80 bg-gradient-to-br ${gradient}`}>
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-transparent" />
        <div className="absolute top-4 left-4">
          <Link
            href={`/${city}`}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            ← {decodeURIComponent(city)}
          </Link>
        </div>
        <div className="absolute bottom-6 left-4 right-4">
          <span className="text-xs bg-[#e94560] text-white px-2 py-0.5 rounded-full font-bold uppercase">
            {event.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-2 leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-6 space-y-6">
        {/* Info box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Data', value: formatFullDate(event.date, event.startTime, event.endTime) },
            { label: 'Luogo', value: event.venue.name },
            { label: 'Indirizzo', value: event.venue.address },
            { label: 'Prezzo', value: formatPrice(event.price) },
          ].map(item => (
            <div key={item.label} className="bg-[#1a1a2e] rounded-xl p-3">
              <p className="text-xs text-[#888] mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Descrizione */}
        {event.description && (
          <div>
            <h2 className="text-sm font-bold text-white mb-2">Descrizione</h2>
            <p className="text-sm text-[#aaa] leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {/* Mini mappa */}
        {event.venue.lat !== 0 && (
          <div>
            <h2 className="text-sm font-bold text-white mb-2">Dove</h2>
            <div className="h-48 rounded-xl overflow-hidden">
              <MiniMap
                events={[event]}
                center={[event.venue.lat, event.venue.lng]}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-[#e94560] hover:bg-[#c73350] text-white text-center py-4 rounded-xl font-bold text-sm transition-colors"
        >
          Compra biglietti su Eventbrite →
        </a>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verifica visiva**

Dalla pagina città, clicca su una card evento — deve aprire la pagina dettaglio con hero, info box, mini-mappa e bottone biglietti.

- [ ] **Step 3: Esegui tutta la suite di test**

```bash
npx jest
```

Output atteso: tutti i test passano.

- [ ] **Step 4: Build di produzione**

```bash
npm run build
```

Output atteso: nessun errore TypeScript o build failure.

- [ ] **Step 5: Commit finale**

```bash
git add src/app/[city]/[id]/
git commit -m "feat: add event detail page with hero, info, mini-map and ticket CTA"
```

---

## Checklist finale

- [ ] `npm run build` passa senza errori
- [ ] `npx jest` — tutti i test passano
- [ ] Homepage mostra il form di ricerca
- [ ] Cerca "Milano" → pagina `/milano` con eventi Eventbrite
- [ ] I filtri (Stasera, Club, ecc.) aggiornano la lista
- [ ] La mappa mostra pin colorati per categoria
- [ ] Hover su card → pin sulla mappa si ingrandisce
- [ ] Click su pin → scroll alla card corrispondente
- [ ] Click su card → pagina dettaglio con hero, info, mini-mappa
- [ ] Su mobile: toggle lista/mappa funziona
- [ ] `.env.local` NON è committato (verificare `.gitignore`)
