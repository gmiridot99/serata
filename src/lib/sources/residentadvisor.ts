import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'
import { haversineKm } from '@/lib/distance'

// RA area IDs for Italian cities. Each entry pinned to canonical lat/lng so we
// can do nearest-area fallback when the user's city isn't in the substring map.
// IDs verified 2026-05-10 via ra.co GraphQL `areas(searchTerm:...)` query.
// Previous IDs (47, 176, 249) pointed to Las Vegas / Amsterdam / empty —
// callers got cross-region pollution masquerading as IT events.
type RAArea = { substrings: string[]; id: number; lat: number; lng: number }

const AREAS: RAArea[] = [
  { substrings: ['milan', 'milano'],     id: 347, lat: 45.4642, lng: 9.1900 },
  { substrings: ['roma', 'rome'],        id: 351, lat: 41.9028, lng: 12.4964 },
  { substrings: ['torin', 'turin'],      id: 348, lat: 45.0703, lng: 7.6869 },
  { substrings: ['bologna'],             id: 350, lat: 44.4949, lng: 11.3426 },
  { substrings: ['firenze', 'florence'], id: 352, lat: 43.7696, lng: 11.2558 },
  { substrings: ['venezia', 'venice'],   id: 349, lat: 45.4408, lng: 12.3155 },
  { substrings: ['napoli', 'naples'],    id: 406, lat: 40.8518, lng: 14.2681 },
]

// km cap for nearest-area fallback. 80km = ~Como/Bergamo/Lecco still match
// Milano, but Trento/Norcia/Aosta no longer get cross-region RA results
// presented as local. Tightened from 200km on 2026-05-10 after smoke test
// showed users in remote provinces seeing distant-city events.
const NEAREST_AREA_CAP_KM = 80



function resolveAreaId(city: string, lat?: number, lng?: number): number | null {
  const lower = city.toLowerCase()
  for (const entry of AREAS) {
    if (entry.substrings.some(s => lower.includes(s))) return entry.id
  }
  // Nearest-area fallback by coords. Avoids silently routing every unknown
  // city to Milano (previous behavior). Cap at 200km to skip far-away matches.
  if (lat !== undefined && lng !== undefined) {
    let best: { id: number; km: number } | null = null
    for (const a of AREAS) {
      const km = haversineKm({ lat, lng }, a)
      if (!best || km < best.km) best = { id: a.id, km }
    }
    if (best && best.km <= NEAREST_AREA_CAP_KM) return best.id
  }
  return null
}

type RAImage = {
  filename?: string | null
  type?: string
}

type RAVenue = {
  name?: string | null
  address?: string | null
  area?: { name?: string | null } | null
}

type RAEvent = {
  id: string
  title?: string | null
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  contentUrl?: string | null
  venue?: RAVenue | null
  images?: RAImage[] | null
  cost?: string | null
  artists?: Array<{ name?: string | null }> | null
}

type RAListing = {
  id: string
  listingDate?: string | null
  event?: RAEvent | null
}

type RAResponse = {
  data?: {
    eventListings?: {
      data?: RAListing[] | null
      totalResults?: number | null
    } | null
  } | null
  errors?: Array<{ message: string }> | null
}

const RA_GRAPHQL_URL = 'https://ra.co/graphql'

const EVENT_LISTINGS_QUERY = `
  query GetEventListings($filters: FilterInputDtoInput, $pageSize: Int) {
    eventListings(filters: $filters, pageSize: $pageSize, page: 1) {
      data {
        id
        listingDate
        event {
          id
          title
          date
          startTime
          endTime
          contentUrl
          venue {
            name
            address
            area { name }
          }
          images { filename type }
          cost
          artists { name }
        }
      }
      totalResults
    }
  }
`

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDateRange(date: string): { gte: string; lte: string } {
  const now = new Date()

  if (date === 'today') {
    const today = toYMD(now)
    return { gte: today, lte: today }
  }

  if (date === 'weekend') {
    const day = now.getDay() // 0=Sun, 6=Sat
    const daysToSat = day === 0 ? 6 : 6 - day
    const sat = new Date(now)
    sat.setDate(now.getDate() + daysToSat)
    const sun = new Date(sat)
    sun.setDate(sat.getDate() + 1)
    return { gte: toYMD(sat), lte: toYMD(sun) }
  }

  // YYYY-MM-DD
  return { gte: date, lte: date }
}

function parsePrice(cost: string | null | undefined): Event['price'] {
  if (!cost) return 'free'
  const trimmed = cost.trim().toLowerCase()
  if (!trimmed || trimmed === 'free' || trimmed === '0') return 'free'
  // Strip currency symbols and try to parse a number
  const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
  if (isNaN(numeric) || numeric === 0) return 'free'
  return { min: numeric, max: numeric, currency: 'EUR' }
}

function pickImageUrl(images: RAImage[] | null | undefined): string | undefined {
  if (!images || images.length === 0) return undefined
  const img = images.find(i => i.filename)
  if (!img?.filename) return undefined
  return img.filename.startsWith('http') ? img.filename : `https://images.ra.co/${img.filename}`
}

function normalizeListing(listing: RAListing, fallbackLat: number, fallbackLng: number): Event {
  const event = listing.event
  const venue = event?.venue

  const startTime = event?.startTime?.slice(11, 16) ?? '22:00'
  const endTime = event?.endTime?.slice(11, 16)

  const date = event?.date ?? listing.listingDate ?? new Date().toISOString().slice(0, 10)
  const dateStr = date.length > 10 ? date.slice(0, 10) : date

  return {
    id: `ra_${listing.id}`,
    title: event?.title ?? '',
    description: event?.artists?.map((a: { name?: string | null }) => a.name).filter(Boolean).join(', ') ?? '',
    category: 'club',
    date: `${dateStr}T00:00:00Z`,
    startTime,
    endTime,
    venue: {
      name: venue?.name ?? '',
      address: venue?.address ?? (venue?.area?.name ?? ''),
      lat: fallbackLat,
      lng: fallbackLng,
    },
    price: parsePrice(event?.cost),
    imageUrl: pickImageUrl(event?.images),
    ticketUrl: event?.contentUrl ? `https://ra.co${event.contentUrl}` : 'https://ra.co',
    source: 'ra',
    sourceTags: ['music:dj'],
  }
}

export class ResidentAdvisorSource implements EventSource {
  async fetch(query: EventQuery): Promise<Event[]> {
    // RA only covers club/electronic — skip if category filter excludes both club and concert
    const categories: EventCategory[] = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : []

    if (categories.length > 0 && !categories.includes('club') && !categories.includes('concert')) {
      return []
    }

    const areaId = resolveAreaId(query.city, query.lat, query.lng)
    if (areaId === null) return []

    let gte: string
    let lte: string

    if (query.date) {
      const range = getDateRange(query.date)
      gte = range.gte
      lte = range.lte
    } else if (query.dateRange) {
      // dateRange uses ISO datetime strings — slice to YYYY-MM-DD
      gte = query.dateRange.start.slice(0, 10)
      lte = query.dateRange.end.slice(0, 10)
    } else {
      const now = new Date()
      gte = toYMD(now)
      const future = new Date(now)
      future.setDate(now.getDate() + 30)
      lte = toYMD(future)
    }

    // RA filter syntax: `{eq: id}` — `{id: ...}` is silently ignored and
    // returns global unfiltered listings (cross-region pollution).
    const variables = {
      filters: {
        areas: { eq: areaId },
        listingDate: { gte, lte },
      },
      pageSize: 50,
    }

    const res = await fetch(RA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://ra.co',
      },
      body: JSON.stringify({ query: EVENT_LISTINGS_QUERY, variables }),
    })

    if (!res.ok) {
      throw new Error(`ResidentAdvisor fetch error: ${res.status} ${res.statusText}`)
    }

    const json: RAResponse = await res.json()

    if (json.errors && json.errors.length > 0) {
      throw new Error(`ResidentAdvisor GraphQL error: ${json.errors[0].message}`)
    }

    const listings = json.data?.eventListings?.data ?? []
    const fallbackLat = query.lat ?? 0
    const fallbackLng = query.lng ?? 0
    return listings.filter((l): l is RAListing => !!l).map(l => normalizeListing(l, fallbackLat, fallbackLng))
  }
}
