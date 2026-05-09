import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

// Eventbrite public REST API was closed in 2023. We hit the same internal
// endpoints used by the eventbrite.it discover frontend. CSRF protected,
// requires session cookie established via prior GET.

const EB_HOST = 'https://www.eventbrite.it'
const SEARCH_PATH = '/api/v3/destination/search/'
const PLACE_FROM_COORDS_PATH = '/api/v3/geo/place_from_coordinates/'
const SESSION_INIT_PATH = '/d/italy--milano/all-events/'

// Eventbrite category IDs → our internal categories
const CATEGORY_MAP: Record<string, EventCategory> = {
  '103': 'concert',  // Music
  '105': 'theatre',  // Performing & Visual Arts
  '110': 'aperitivo', // Food & Drink
  '113': 'club',     // Community (close enough)
}

const CATEGORY_TO_EB_ID: Record<EventCategory, string | undefined> = {
  concert: '103',
  theatre: '105',
  aperitivo: '110',
  club: '113',
  other: undefined,
}

type EBAddress = {
  city?: string
  country?: string
  region?: string
  longitude?: string
  latitude?: string
  localized_address_display?: string
  address_1?: string
  address_2?: string
}

type EBVenue = {
  name?: string
  id?: string
  address?: EBAddress
}

type EBImageSizes = {
  small?: string
  medium?: string
  large?: string
}

type EBImage = {
  url?: string
  id?: string
  image_sizes?: EBImageSizes
}

type EBTag = {
  prefix?: string
  tag?: string
  display_name?: string
}

type EBPrice = {
  currency?: string
  value?: number       // minor units (cents)
  major_value?: string // "10.50"
}

type EBTicketAvailability = {
  is_free?: boolean
  is_sold_out?: boolean
  has_available_tickets?: boolean
  minimum_ticket_price?: EBPrice
  maximum_ticket_price?: EBPrice
}

type EBEvent = {
  id: string
  name: string
  url: string
  summary?: string
  full_description?: string
  start_date: string  // YYYY-MM-DD
  start_time?: string // HH:MM
  end_date?: string
  end_time?: string
  timezone?: string
  is_online_event?: boolean
  is_cancelled?: boolean
  primary_venue?: EBVenue
  primary_venue_id?: string
  image?: EBImage
  ticket_availability?: EBTicketAvailability
  tags?: EBTag[]
  tickets_url?: string
}

type EBSearchResponse = {
  events?: {
    results?: EBEvent[]
    pagination?: { page_count?: number; object_count?: number }
  }
  status_code?: number
  error?: string
}

type EBPlace = {
  id: string
  name?: string
  place_type?: string
  location_slug?: string
}

type EBPlaceFromCoordsResponse = {
  place?: EBPlace
}

// Session cache: csrftoken + cookie header.
let cachedSession: { csrf: string; cookie: string; expiresAt: number } | null = null
const SESSION_TTL_MS = 1000 * 60 * 30 // 30min — Eventbrite cookie lasts 1y, but rotate to be safe

async function getSession(): Promise<{ csrf: string; cookie: string }> {
  const now = Date.now()
  if (cachedSession && now < cachedSession.expiresAt) {
    return { csrf: cachedSession.csrf, cookie: cachedSession.cookie }
  }
  const res = await fetch(EB_HOST + SESSION_INIT_PATH, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`Eventbrite session init failed: ${res.status}`)
  const setCookies = res.headers.getSetCookie?.() ?? []
  let csrf: string | null = null
  const pairs: string[] = []
  for (const c of setCookies) {
    const [pair] = c.split(';')
    pairs.push(pair)
    if (pair.startsWith('csrftoken=')) csrf = pair.slice('csrftoken='.length)
  }
  if (!csrf) throw new Error('Eventbrite csrftoken not found in Set-Cookie')
  const session = { csrf, cookie: pairs.join('; '), expiresAt: now + SESSION_TTL_MS }
  cachedSession = session
  return { csrf: session.csrf, cookie: session.cookie }
}

// Place ID cache: lat/lng (rounded) → EB place ID
const placeCache = new Map<string, string | null>()
const PLACE_TTL_MS = 1000 * 60 * 60 * 24 // 24h
const placeCacheExpiry = new Map<string, number>()

async function placeFromCoords(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
  const now = Date.now()
  const cached = placeCache.get(key)
  const expiry = placeCacheExpiry.get(key) ?? 0
  if (cached !== undefined && now < expiry) return cached

  const url = `${EB_HOST}${PLACE_FROM_COORDS_PATH}?latitude=${lat}&longitude=${lng}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) {
    placeCache.set(key, null)
    placeCacheExpiry.set(key, now + PLACE_TTL_MS)
    return null
  }
  const data = (await res.json()) as EBPlaceFromCoordsResponse
  // Prefer locality-level place
  const placeId = data.place?.id ?? null
  placeCache.set(key, placeId)
  placeCacheExpiry.set(key, now + PLACE_TTL_MS)
  return placeId
}

function buildDateFilter(query: EventQuery): { dates?: string; date_range?: { from: string; to: string } } {
  if (!query.date && !query.dateRange) return { dates: 'current_future' }

  if (query.date === 'today') return { dates: 'today' }
  if (query.date === 'weekend') return { dates: 'this_weekend' }
  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    return { date_range: { from: query.date, to: query.date } }
  }
  if (query.dateRange) {
    return {
      date_range: {
        from: query.dateRange.start.slice(0, 10),
        to: query.dateRange.end.slice(0, 10),
      },
    }
  }
  return { dates: 'current_future' }
}

function categoryFromTags(tags: EBTag[] | undefined): EventCategory {
  if (!tags) return 'other'
  for (const t of tags) {
    if (t.prefix !== 'EventbriteCategory') continue
    const id = t.tag?.split('/')[1]
    if (id && CATEGORY_MAP[id]) return CATEGORY_MAP[id]
  }
  return 'other'
}

function parsePrice(t: EBTicketAvailability | undefined): Event['price'] {
  if (!t || t.is_free) return 'free'
  const min = t.minimum_ticket_price
  const max = t.maximum_ticket_price ?? min
  if (!min || min.value === undefined) return 'free'
  // value is in minor units (cents)
  const minMaj = (min.value ?? 0) / 100
  const maxMaj = (max?.value ?? min.value ?? 0) / 100
  return { min: minMaj, max: maxMaj, currency: min.currency ?? 'EUR' }
}

function pickImage(img: EBImage | undefined): string | undefined {
  if (!img) return undefined
  return img.image_sizes?.medium ?? img.image_sizes?.large ?? img.url
}

function normalizeEvent(raw: EBEvent): Event | null {
  if (!raw.id || !raw.start_date) return null
  if (raw.is_cancelled) return null
  const venue = raw.primary_venue
  const lat = parseFloat(venue?.address?.latitude ?? '0')
  const lng = parseFloat(venue?.address?.longitude ?? '0')

  // Build ISO-like datetime from start_date + start_time + timezone
  const startTime = raw.start_time ?? '00:00'
  const dateIso = `${raw.start_date}T${startTime}:00`

  const sourceTags = (raw.tags ?? [])
    .map(t => t.tag)
    .filter((v): v is string => typeof v === 'string')

  return {
    id: `eb_${raw.id}`,
    title: raw.name,
    description: raw.summary ?? '',
    category: categoryFromTags(raw.tags),
    date: dateIso,
    startTime,
    endTime: raw.end_time,
    venue: {
      name: venue?.name ?? '',
      address: venue?.address?.localized_address_display ?? '',
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
    },
    price: parsePrice(raw.ticket_availability),
    imageUrl: pickImage(raw.image),
    ticketUrl: raw.tickets_url ?? raw.url,
    source: 'eventbrite',
    sourceTags,
  }
}

const MAX_PAGES = 3 // 60 events per category — enough for one city/day view

export class EventbriteSource implements EventSource {
  async fetch(query: EventQuery): Promise<Event[]> {
    if (query.lat === undefined || query.lng === undefined) return []

    let placeId: string | null
    try {
      placeId = await placeFromCoords(query.lat, query.lng)
    } catch (err) {
      console.error('[eventbrite] place lookup failed:', err)
      return []
    }
    if (!placeId) return []

    let session: { csrf: string; cookie: string }
    try {
      session = await getSession()
    } catch (err) {
      console.error('[eventbrite] session init failed:', err)
      return []
    }

    const dateFilter = buildDateFilter(query)
    const categories: EventCategory[] = query.category
      ? Array.isArray(query.category) ? query.category : [query.category]
      : []
    const ebCategoryIds = categories
      .map(c => CATEGORY_TO_EB_ID[c])
      .filter((id): id is string => !!id)

    const baseBody = {
      event_search: {
        ...dateFilter,
        places: [placeId],
        dedup: true,
        page_size: 20,
        page: 1,
        ...(ebCategoryIds.length > 0 ? { tags: ebCategoryIds.map(id => `EventbriteCategory/${id}`) } : {}),
      },
      'expand.destination_event': [
        'primary_venue',
        'image',
        'ticket_availability',
        'event_sales_status',
      ],
    }

    const all: Event[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = { ...baseBody, event_search: { ...baseBody.event_search, page } }
      let resp: EBSearchResponse
      try {
        const res = await fetch(EB_HOST + SEARCH_PATH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            Origin: EB_HOST,
            Referer: EB_HOST + SESSION_INIT_PATH,
            'X-CSRFToken': session.csrf,
            Cookie: session.cookie,
          },
          body: JSON.stringify(body),
        })
        if (res.status === 401 || res.status === 403) {
          // Session expired — invalidate and retry once
          cachedSession = null
          if (page === 1) {
            session = await getSession()
            page = 0 // restart loop
            continue
          }
          break
        }
        if (!res.ok) {
          console.error('[eventbrite] search failed:', res.status)
          break
        }
        resp = (await res.json()) as EBSearchResponse
      } catch (err) {
        console.error('[eventbrite] fetch error:', err)
        break
      }

      const results = resp.events?.results ?? []
      for (const r of results) {
        const norm = normalizeEvent(r)
        if (norm) all.push(norm)
      }
      const pageCount = resp.events?.pagination?.page_count ?? 0
      if (page >= pageCount) break
    }

    return all
  }

  async fetchById(id: string): Promise<Event | null> {
    // EB does not expose a direct public event-by-id endpoint without a token.
    // Caller falls through to other sources.
    void id
    return null
  }
}
