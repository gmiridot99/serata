import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

type TmVenue = {
  name: string
  address?: { line1?: string }
  city?: { name: string }
  location?: { latitude: string; longitude: string }
}

type TmEvent = {
  id: string
  name: string
  dates: {
    start: { localDate: string; localTime?: string }
    end?: { localDate?: string; localTime?: string }
  }
  classifications?: Array<{
    segment?: { name: string }
    genre?: { name: string }
  }>
  priceRanges?: Array<{ min: number; max: number; currency: string }>
  images?: Array<{ url: string; width: number; height: number }>
  url: string
  _embedded?: {
    venues?: TmVenue[]
  }
}

function mapCategory(classifications?: TmEvent['classifications']): EventCategory {
  if (!classifications || classifications.length === 0) return 'other'
  const c = classifications[0]
  const segmentName = c.segment?.name?.toLowerCase() ?? ''
  const genreName = c.genre?.name?.toLowerCase() ?? ''

  if (segmentName.includes('music')) return 'concert'
  if (segmentName.includes('arts') || segmentName.includes('theatre')) {
    if (genreName.includes('classical')) return 'concert'
    return 'theatre'
  }
  if (segmentName.includes('club') || segmentName.includes('nightlife')) return 'club'
  if (genreName.includes('club') || genreName.includes('nightlife')) return 'club'

  return 'other'
}

function pickLargestImage(images?: TmEvent['images']): string | undefined {
  if (!images || images.length === 0) return undefined
  return images.reduce((best, img) => (img.width > best.width ? img : best)).url
}

function buildVenueAddress(venue: TmVenue): string {
  const parts: string[] = []
  if (venue.address?.line1) parts.push(venue.address.line1)
  if (venue.city?.name) parts.push(venue.city.name)
  return parts.join(', ')
}

export function normalizeEvent(raw: TmEvent): Event {
  const venue = raw._embedded?.venues?.[0]

  return {
    id: `tm_${raw.id}`,
    title: raw.name,
    description: '',
    category: mapCategory(raw.classifications),
    date: raw.dates.start.localDate + 'T00:00:00Z',
    startTime: raw.dates.start.localTime?.slice(0, 5) ?? '00:00',
    endTime: raw.dates.end?.localTime?.slice(0, 5),
    venue: {
      name: venue?.name ?? '',
      address: venue ? buildVenueAddress(venue) : '',
      lat: parseFloat(venue?.location?.latitude ?? '0'),
      lng: parseFloat(venue?.location?.longitude ?? '0'),
    },
    price:
      raw.priceRanges && raw.priceRanges.length > 0 && raw.priceRanges[0].min > 0
        ? {
            min: raw.priceRanges[0].min,
            max: raw.priceRanges[0].max,
            currency: raw.priceRanges[0].currency,
          }
        : 'free',
    imageUrl: pickLargestImage(raw.images),
    ticketUrl: raw.url,
    source: 'ticketmaster',
  }
}

function getDateRange(date: 'today' | 'weekend'): { start: string; end: string } {
  const now = new Date()
  if (date === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }
  // weekend: next Saturday 00:00 → next Sunday 23:59
  const day = now.getDay() // 0=Sun, 6=Sat
  const daysToSat = day === 0 ? 6 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  return { start: sat.toISOString(), end: sun.toISOString() }
}

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2'

export class TicketmasterSource implements EventSource {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    const categories: EventCategory[] = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : []

    // Ticketmaster has no aperitivo/club — bail out early if that's all we need
    const tmCategories = categories.filter(c => c !== 'aperitivo' && c !== 'club')
    if (categories.length > 0 && tmCategories.length === 0) return []

    const params = new URLSearchParams({
      apikey: this.apiKey,
      city: query.city,
      countryCode: 'IT',
      size: '50',
    })

    // Map our categories to Ticketmaster classificationName
    if (tmCategories.length > 0) {
      const tmClassifications = tmCategories.map(c => {
        if (c === 'concert') return 'music'
        if (c === 'theatre') return 'arts & theatre'
        return 'miscellaneous'
      })
      // Use the first classification (TM only supports one classificationName at a time)
      params.set('classificationName', tmClassifications[0])
    }

    if (query.date) {
      const range = getDateRange(query.date)
      params.set('startDateTime', range.start)
      params.set('endDateTime', range.end)
    } else {
      params.set('startDateTime', new Date().toISOString())
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

  async fetchById(id: string): Promise<Event | null> {
    const rawId = id.replace('tm_', '')
    const res = await fetch(
      `${TM_BASE}/events/${rawId}.json?apikey=${this.apiKey}`
    )
    if (!res.ok) throw new Error(`Ticketmaster error: ${res.status}`)
    const data: TmEvent = await res.json()
    return normalizeEvent(data)
  }
}
