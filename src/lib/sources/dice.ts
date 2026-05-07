import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

// DICE.fm uses Next.js SSR. We hit the public _next/data endpoint that
// backs the /browse/<city-slug> pages. No auth required, but buildId
// rotates on every DICE deploy — refresh on 404.

const DICE_HOST = 'https://dice.fm'
const DICE_API = 'https://api.dice.fm'

// Italian/locale aliases that map to canonical DICE perm_names.
const CITY_ALIASES: Record<string, string[]> = {
  milano: ['milan'],
  roma: ['rome'],
  napoli: ['naples'],
  // Bologna, Torino etc. canonical name == localized
}

type DiceVenue = {
  id?: string
  name?: string | null
  address?: string | null
  location?: { lat?: number | null; lng?: number | null } | null
}

type DiceImages = {
  landscape?: string | null
  portrait?: string | null
  square?: string | null
}

type DiceTag = { name?: string; value?: string; title?: string }

type DicePrice = {
  currency?: string
  amount?: number | null
  amount_from?: number | null
} | null

type DiceEvent = {
  id: string
  name?: string | null
  perm_name?: string | null
  dates?: {
    event_start_date?: string | null
    event_end_date?: string | null
  } | null
  venues?: DiceVenue[] | null
  images?: DiceImages | null
  price?: DicePrice
  about?: { description?: string | null } | null
  tags_types?: DiceTag[] | null
  social_links?: { event_share?: string | null } | null
}

type DiceNextDataResponse = {
  pageProps?: {
    events?: DiceEvent[] | null
    nextCursor?: string | null
  } | null
}

type DiceCity = {
  id: string
  name: string
  perm_name: string
  country_code?: string
  country_name?: string
}

let cachedBuildId: string | null = null
let buildIdFetchedAt = 0
const BUILD_ID_TTL_MS = 1000 * 60 * 60 // 1h

let cachedCities: DiceCity[] | null = null
let citiesFetchedAt = 0
const CITIES_TTL_MS = 1000 * 60 * 60 * 24 // 24h

async function fetchBuildId(): Promise<string> {
  const now = Date.now()
  if (cachedBuildId && now - buildIdFetchedAt < BUILD_ID_TTL_MS) {
    return cachedBuildId
  }
  const res = await fetch(DICE_HOST + '/', {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`DICE homepage fetch ${res.status}`)
  const html = await res.text()
  const m = html.match(/"buildId":"([^"]+)"/)
  if (!m) throw new Error('DICE buildId not found in homepage')
  cachedBuildId = m[1]
  buildIdFetchedAt = now
  return cachedBuildId
}

async function fetchCities(): Promise<DiceCity[]> {
  const now = Date.now()
  if (cachedCities && now - citiesFetchedAt < CITIES_TTL_MS) {
    return cachedCities
  }
  const res = await fetch(`${DICE_API}/cities`)
  if (!res.ok) throw new Error(`DICE cities fetch ${res.status}`)
  const raw = await res.json()
  const arr: DiceCity[] = Array.isArray(raw) ? raw : (raw.data ?? [])
  cachedCities = arr
  citiesFetchedAt = now
  return arr
}

function citySlug(c: DiceCity): string {
  // Mirror DICE's client-side slug builder
  if (c.perm_name.includes(':')) return c.perm_name
  return `${c.perm_name}-${c.id}`.toLowerCase()
}

function matchesCity(c: DiceCity, query: string): boolean {
  const q = query.toLowerCase().trim()
  const candidates = [
    c.perm_name.toLowerCase(),
    c.name.toLowerCase(),
    ...(CITY_ALIASES[c.perm_name.toLowerCase()] ?? []),
  ]
  return candidates.some(cand => q === cand || q.includes(cand) || cand.includes(q))
}

async function resolveSlug(city: string): Promise<string | null> {
  let cities: DiceCity[]
  try {
    cities = await fetchCities()
  } catch (err) {
    console.error('[dice] cities resolve failed:', err)
    return null
  }
  const match = cities.find(c => matchesCity(c, city))
  return match ? citySlug(match) : null
}

function categoryFromTags(tags: DiceTag[] | null | undefined): EventCategory {
  if (!tags || tags.length === 0) return 'other'
  const values = tags.map(t => t.value ?? '')
  if (values.includes('music:dj')) return 'club'
  if (values.includes('music:gig') || values.some(v => v.startsWith('music:'))) return 'concert'
  if (values.includes('culture:film') || values.includes('culture:theatre')) return 'theatre'
  if (values.some(v => v.startsWith('food'))) return 'aperitivo'
  return 'other'
}

function mapCategoryToFilter(c: EventCategory): string | null {
  switch (c) {
    case 'club': return 'music/dj'
    case 'concert': return 'music/gig'
    case 'theatre': return 'culture/film'
    default: return null
  }
}

function parsePrice(price: DicePrice): Event['price'] {
  if (!price) return 'free'
  const amount = price.amount ?? 0
  if (amount <= 0) return 'free'
  // DICE returns amount in minor currency units (cents)
  const value = amount / 100
  return { min: value, max: value, currency: price.currency ?? 'EUR' }
}

function pickImage(images: DiceImages | null | undefined): string | undefined {
  if (!images) return undefined
  return images.landscape ?? images.portrait ?? images.square ?? undefined
}

function extractTime(iso: string | null | undefined): string {
  if (!iso) return '22:00'
  // ISO format: 2026-05-07T20:00:00+02:00 → take HH:MM
  const m = iso.match(/T(\d{2}:\d{2})/)
  return m ? m[1] : '22:00'
}

function normalizeEvent(raw: DiceEvent): Event | null {
  if (!raw.id || !raw.dates?.event_start_date) return null
  const venue = raw.venues?.[0]
  const lat = venue?.location?.lat ?? 0
  const lng = venue?.location?.lng ?? 0
  const startIso = raw.dates.event_start_date

  const ticketUrl = raw.social_links?.event_share
    ?? (raw.perm_name ? `${DICE_HOST}/event/${raw.perm_name}` : DICE_HOST)

  return {
    id: `dice_${raw.id}`,
    title: raw.name ?? '',
    description: raw.about?.description?.trim() ?? '',
    category: categoryFromTags(raw.tags_types),
    date: startIso,
    startTime: extractTime(startIso),
    endTime: raw.dates.event_end_date ? extractTime(raw.dates.event_end_date) : undefined,
    venue: {
      name: venue?.name ?? '',
      address: venue?.address ?? '',
      lat,
      lng,
    },
    price: parsePrice(raw.price ?? null),
    imageUrl: pickImage(raw.images),
    ticketUrl,
    source: 'dice',
  }
}

function toLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function inDateRange(event: Event, query: EventQuery): boolean {
  if (!query.date && !query.dateRange) return true
  const eventDay = event.date.slice(0, 10)
  if (query.date === 'today') {
    return eventDay === toLocalYMD(new Date())
  }
  if (query.date === 'weekend') {
    const now = new Date()
    const day = now.getDay()
    const daysToSat = day === 0 ? 6 : 6 - day
    const sat = new Date(now); sat.setDate(now.getDate() + daysToSat)
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1)
    return eventDay === toLocalYMD(sat) || eventDay === toLocalYMD(sun)
  }
  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    return eventDay === query.date
  }
  if (query.dateRange) {
    const start = query.dateRange.start.slice(0, 10)
    const end = query.dateRange.end.slice(0, 10)
    return eventDay >= start && eventDay <= end
  }
  return true
}

async function fetchPage(
  buildId: string,
  slug: string,
  filterPath: string | null,
  cursor: string | null
): Promise<DiceNextDataResponse> {
  const slugParts = [slug, ...(filterPath ? filterPath.split('/') : [])]
  const pathSuffix = filterPath ? `/${filterPath}` : ''
  const params = new URLSearchParams()
  for (const p of slugParts) params.append('slug', p)
  if (cursor) params.set('cursor', cursor)

  const url = `${DICE_HOST}/_next/data/${buildId}/en/browse/${slug}${pathSuffix}.json?${params}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (res.status === 404) {
    cachedBuildId = null
    throw new Error('DICE buildId stale (404)')
  }
  if (!res.ok) throw new Error(`DICE fetch ${res.status}`)
  return res.json() as Promise<DiceNextDataResponse>
}

const MAX_PAGES = 3 // ~72-90 events per filter — plenty for one city/day view

export class DiceSource implements EventSource {
  async fetch(query: EventQuery): Promise<Event[]> {
    const slug = await resolveSlug(query.city)
    if (!slug) return []

    // Determine which filter paths to fetch based on category
    const categories: EventCategory[] = query.category
      ? Array.isArray(query.category) ? query.category : [query.category]
      : []
    const filterPaths: (string | null)[] = categories.length > 0
      ? Array.from(new Set(categories.map(mapCategoryToFilter).filter((p): p is string => !!p)))
      : [null] // no filter → city overview

    let buildId: string
    try {
      buildId = await fetchBuildId()
    } catch (err) {
      console.error('[dice] buildId resolve failed:', err)
      return []
    }

    const all: Event[] = []
    for (const filterPath of filterPaths) {
      let cursor: string | null = null
      for (let page = 0; page < MAX_PAGES; page++) {
        let resp: DiceNextDataResponse
        try {
          resp = await fetchPage(buildId, slug, filterPath, cursor)
        } catch (err) {
          // retry once with fresh buildId on 404
          if (page === 0 && String(err).includes('stale')) {
            buildId = await fetchBuildId()
            resp = await fetchPage(buildId, slug, filterPath, cursor)
          } else {
            console.error('[dice] page fetch failed:', err)
            break
          }
        }
        const events = resp.pageProps?.events ?? []
        for (const e of events) {
          const norm = normalizeEvent(e)
          if (norm && inDateRange(norm, query)) all.push(norm)
        }
        cursor = resp.pageProps?.nextCursor ?? null
        if (!cursor) break
      }
    }

    return all
  }
}
