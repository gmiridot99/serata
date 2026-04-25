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

  async fetchById(id: string): Promise<Event | null> {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/${id}/?expand=venue,logo,ticket_availability`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    if (!res.ok) throw new Error(`Eventbrite error: ${res.status}`)
    const data = await res.json()
    return normalizeEvent(data)
  }
}
