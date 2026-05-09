import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

// RA area IDs for Italian cities
const AREA_IDS: { substrings: string[]; id: number }[] = [
  { substrings: ['milan', 'milano'], id: 47 },
  { substrings: ['roma', 'rome'], id: 176 },
  { substrings: ['torin'], id: 249 },
]

const DEFAULT_AREA_ID = 47

function resolveAreaId(city: string): number {
  const lower = city.toLowerCase()
  for (const entry of AREA_IDS) {
    if (entry.substrings.some(s => lower.includes(s))) return entry.id
  }
  return DEFAULT_AREA_ID
}

type RAImage = {
  filename?: string | null
  type?: string
}

type RAVenue = {
  name?: string | null
  address?: string | null
  area?: { name?: string | null } | null
  lat?: number | null
  lng?: number | null
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
            lat
            lng
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
  return img?.filename ? `https://img.ra.co/${img.filename}` : undefined
}

function normalizeListing(listing: RAListing): Event {
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
      lat: venue?.lat ?? 0,
      lng: venue?.lng ?? 0,
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

    const areaId = resolveAreaId(query.city)

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

    const variables = {
      filters: {
        areas: { id: areaId },
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
    return listings.filter((l): l is RAListing => !!l).map(normalizeListing)
  }
}
