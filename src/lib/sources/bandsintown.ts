import type { Event, EventQuery, EventSource } from '@/lib/types'

const BASE_URL = 'https://rest.bandsintown.com'

interface BITVenue {
  name: string
  city: string
  country: string
  latitude: string | number
  longitude: string | number
  address?: string
  street_address?: string
}

interface BITOffer {
  type: string
  url: string
  status: string
}

interface BITArtist {
  name: string
  image_url?: string
}

interface BITEvent {
  id: string
  title?: string
  datetime: string
  end_datetime?: string
  venue: BITVenue
  offers?: BITOffer[]
  lineup?: string[]
  artists?: BITArtist[]
  description?: string
  on_sale_datetime?: string
}

function getWeekendDates(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  const diffToSat = day === 0 ? -1 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + diffToSat)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  return {
    start: sat.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  }
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveDateRange(query: EventQuery): string {
  if (query.date) {
    if (query.date === 'today') {
      const d = todayString()
      return `${d},${d}`
    }
    if (query.date === 'weekend') {
      const { start, end } = getWeekendDates()
      return `${start},${end}`
    }
    // YYYY-MM-DD
    return `${query.date},${query.date}`
  }
  if (query.dateRange) {
    const start = query.dateRange.start.slice(0, 10)
    const end = query.dateRange.end.slice(0, 10)
    return `${start},${end}`
  }
  return 'upcoming'
}

function resolveLocation(query: EventQuery): string {
  if (query.lat != null && query.lng != null) {
    return `${query.lat},${query.lng}`
  }
  return query.city
}

function mapEvent(raw: BITEvent): Event {
  const dt = new Date(raw.datetime)
  const date = dt.toISOString().slice(0, 10)
  const startTime = dt.toISOString().slice(11, 16)

  let endTime: string | undefined
  if (raw.end_datetime) {
    const end = new Date(raw.end_datetime)
    endTime = end.toISOString().slice(11, 16)
  }

  const lat = typeof raw.venue.latitude === 'string'
    ? parseFloat(raw.venue.latitude)
    : raw.venue.latitude
  const lng = typeof raw.venue.longitude === 'string'
    ? parseFloat(raw.venue.longitude)
    : raw.venue.longitude

  const address =
    raw.venue.street_address ??
    raw.venue.address ??
    `${raw.venue.city}, ${raw.venue.country}`

  const lineup = raw.lineup ?? raw.artists?.map((a) => a.name) ?? []
  const title = raw.title ?? (lineup.length > 0 ? lineup.join(', ') : 'Concert')

  const ticketOffer = raw.offers?.find((o) => o.type === 'Tickets' && o.url)
  const ticketUrl = ticketOffer?.url ?? `https://www.bandsintown.com/e/${raw.id}`

  const imageUrl = raw.artists?.[0]?.image_url ?? undefined

  return {
    id: `bit_${raw.id}`,
    title,
    description: raw.description ?? '',
    category: 'concert',
    date,
    startTime,
    endTime,
    venue: {
      name: raw.venue.name,
      address,
      lat,
      lng,
    },
    price: 'free',
    imageUrl,
    ticketUrl,
    source: 'bandsintown',
  }
}

export class BandsintownSource implements EventSource {
  private readonly appId: string

  constructor(appId: string) {
    this.appId = appId
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    // Bandsintown is concerts-only; skip if filter excludes concerts
    if (query.category != null) {
      const cats = Array.isArray(query.category) ? query.category : [query.category]
      if (!cats.includes('concert')) return []
    }

    const location = resolveLocation(query)
    const dateRange = resolveDateRange(query)
    const radius = query.radiusKm ?? (query.lat != null ? 10 : undefined)

    const params = new URLSearchParams({
      app_id: this.appId,
      location,
      date: dateRange,
    })
    if (radius != null) params.set('radius', String(radius))

    const url = `${BASE_URL}/v4/events/search?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Bandsintown API error: ${res.status} ${res.statusText}`)
    }

    const data: BITEvent[] = await res.json()
    if (!Array.isArray(data)) return []

    return data.map(mapEvent)
  }

  async fetchById(id: string): Promise<Event | null> {
    // Strip the bit_ prefix before calling the API
    const rawId = id.startsWith('bit_') ? id.slice(4) : id

    const params = new URLSearchParams({ app_id: this.appId })
    const url = `${BASE_URL}/v4/events/${rawId}?${params.toString()}`
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Bandsintown API error: ${res.status} ${res.statusText}`)
    }

    const data: BITEvent = await res.json()
    return mapEvent(data)
  }
}
