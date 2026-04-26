import { cache } from 'react'
import type { Event, EventQuery } from '@/lib/types'
import { TicketmasterSource } from './ticketmaster'
import { PlacesSource } from './places'

const eventSources = [
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
]

const placesSource = new PlacesSource(process.env.GOOGLE_PLACES_API_KEY ?? '')

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  if (query.mode === 'venues') {
    return placesSource.fetch(query)
  }
  const results = await Promise.allSettled(eventSources.map((s) => s.fetch(query)))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[sources] source[${i}] failed:`, r.reason)
    }
  })
  return results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
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
