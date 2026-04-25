import { cache } from 'react'
import type { Event, EventQuery } from '@/lib/types'
import { EventbriteSource } from './eventbrite'
import { MockSource } from './mock'
import { TicketmasterSource } from './ticketmaster'

const sources = [
  new MockSource(),
  new TicketmasterSource(process.env.TICKETMASTER_API_KEY ?? ''),
  new EventbriteSource(process.env.EVENTBRITE_TOKEN ?? ''),
]

export async function fetchEvents(query: EventQuery): Promise<Event[]> {
  const results = await Promise.allSettled(sources.map(s => s.fetch(query)))
  return results
    .filter((r): r is PromiseFulfilledResult<Event[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}

export const fetchEventById = cache(async (id: string): Promise<Event | null> => {
  for (const source of sources) {
    if (!source.fetchById) continue
    try {
      const event = await source.fetchById(id)
      if (event) return event
    } catch {
      // try next source
    }
  }
  return null
})
