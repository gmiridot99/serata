import { cache } from 'react'
import type { Event, EventQuery, EventSource } from '@/lib/types'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'
import { ResidentAdvisorSource } from './residentadvisor'
import { DiceSource } from './dice'
import { EventbriteSource } from './eventbrite'
import { InstagramSource } from './instagram'
import { expandVenueQuery } from '@/lib/venueExpand'
import { deduplicateEvents } from '@/lib/dedup'

// Bandsintown: v4 location search requires registered API key — disabled
const eventSources: EventSource[] = [
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
  new ResidentAdvisorSource(),
  new DiceSource(),
  new EventbriteSource(),
  // Gated behind INSTAGRAM_ENABLED env var — see InstagramSource.fetch
  new InstagramSource(process.env.GOOGLE_PLACES_API_KEY ?? ''),
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
  const events = results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
  return deduplicateEvents(events)
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
