import type { Event, EventQuery, EventSource } from '@/lib/types'
import { resolveInstagramHandle } from '@/lib/resolveInstagramHandle'
import { scrapeInstagramPosts } from '@/lib/scrapeInstagramPosts'
import { parseInstagramCaptions, type IGParsedEvent } from '@/lib/parseInstagramCaptions'
import { PlacesSource } from './places'

// Instagram is gated behind INSTAGRAM_ENABLED=true. Even when enabled it is
// inherently fragile (scraping, rate limits) and designed to fail to [].

const MAX_VENUES = 8
const MAX_CONCURRENT_SCRAPES = 3

function isEnabled(): boolean {
  return process.env.INSTAGRAM_ENABLED === 'true'
}

function parsePrice(raw: string): Event['price'] {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed || trimmed === 'free' || trimmed === 'gratis' || trimmed === '0') return 'free'
  const numeric = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
  if (isNaN(numeric) || numeric === 0) return 'free'
  return { min: numeric, max: numeric, currency: 'EUR' }
}

function eventIdFromCaption(handle: string, parsed: IGParsedEvent): string {
  // Stable-ish id: handle + date + slug of title
  const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  return `ig_${handle}_${parsed.date}_${slug}`
}

function normalize(handle: string, venue: { name: string; address: string; lat: number; lng: number }, parsed: IGParsedEvent): Event {
  return {
    id: eventIdFromCaption(handle, parsed),
    title: parsed.title,
    description: parsed.description,
    category: 'other',
    date: `${parsed.date}T00:00:00Z`,
    startTime: parsed.startTime,
    venue,
    price: parsePrice(parsed.price),
    ticketUrl: `https://www.instagram.com/${handle}/`,
    source: 'instagram',
  }
}

async function processVenue(
  venueEvent: Event,
  query: EventQuery,
): Promise<Event[]> {
  const handle = await resolveInstagramHandle(venueEvent.venue.name, query.city)
  if (!handle) return []
  const captions = await scrapeInstagramPosts(handle)
  if (captions.length === 0) return []
  const parsed = await parseInstagramCaptions(captions)
  return parsed.map(p => normalize(handle, venueEvent.venue, p))
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        results.push(await fn(items[idx]))
      } catch (err) {
        console.error('[ig] worker failed:', err)
      }
    }
  })
  await Promise.all(workers)
  return results
}

export class InstagramSource implements EventSource {
  private placesSource: PlacesSource

  constructor(placesApiKey: string) {
    this.placesSource = new PlacesSource(placesApiKey)
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    if (!isEnabled()) return []

    let venues: Event[] = []
    try {
      venues = await this.placesSource.fetch({ ...query, q: 'club bar locale' })
    } catch (err) {
      console.error('[ig] venue lookup failed:', err)
      return []
    }
    venues = venues.slice(0, MAX_VENUES).filter(v => v.venue.name)
    if (venues.length === 0) return []

    const batches = await runWithConcurrency(venues, MAX_CONCURRENT_SCRAPES, v => processVenue(v, query))
    return batches.flat()
  }
}
