import { cache } from 'react'
import type { Event, EventQuery, EventSource } from '@/lib/types'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'
import { ResidentAdvisorSource } from './residentadvisor'
import { DiceSource } from './dice'
import { EventbriteSource } from './eventbrite'
import { expandVenueQuery } from '@/lib/venueExpand'
import { deduplicateEvents } from '@/lib/dedup'
import { haversineKm } from '@/lib/distance'

// Bandsintown: v4 location search requires registered API key — disabled
const eventSources: EventSource[] = [
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
  new ResidentAdvisorSource(),
  new DiceSource(),
  new EventbriteSource(),
]

const placesSource = new PlacesSource(process.env.GOOGLE_PLACES_API_KEY ?? '')

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  if (query.mode === 'venues') {
    const terms = expandVenueQuery(query.q ?? '')
    return placesSource.fetchMulti(query, terms)
  }
  const results = await Promise.allSettled(eventSources.map((s) => s.fetch(query)))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[sources] source[${i}] failed:`, r.reason)
    }
  })
  const raw = results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
  const deduped = deduplicateEvents(raw)

  // Post-filter: remove events with valid coords that are beyond 1.5× the search radius.
  // Events with lat=0,lng=0 (unknown coords) are kept as-is.
  if (query.lat !== undefined && query.lng !== undefined) {
    const cap = (query.radiusKm ?? 10) * 1.5
    const origin = { lat: query.lat, lng: query.lng }
    return deduped.filter((e) => {
      if (e.venue.lat === 0 && e.venue.lng === 0) return true
      return haversineKm(origin, { lat: e.venue.lat, lng: e.venue.lng }) <= cap
    })
  }
  return deduped
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
