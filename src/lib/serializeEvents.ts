import type { Event } from '@/lib/types'
import { tagCache } from '@/lib/tagCache'

type SerializedEvent = {
  id: string
  title: string
  venue?: string
  date?: string
  startTime?: string
  tags?: string[]
  lat?: number
  lng?: number
}

function buildTags(event: Event): string[] {
  const tags: string[] = []
  const cached = tagCache.get(event.id)
  if (cached?.eventType) {
    for (const t of cached.eventType) tags.push(`music:${t}`)
  }
  if (cached?.setting) tags.push(cached.setting)
  if (event.sourceTags) {
    for (const t of event.sourceTags) {
      if (!tags.includes(t)) tags.push(t)
    }
  }
  return tags
}

export function serializeEventsForLLM(events: Event[]): string {
  const out: SerializedEvent[] = events.map(e => {
    const item: SerializedEvent = { id: e.id, title: e.title }
    const venueLabel = [e.venue?.name, e.venue?.address].filter(Boolean).join(', ')
    if (venueLabel) item.venue = venueLabel
    if (e.date) item.date = e.date.slice(0, 10)
    if (e.startTime) item.startTime = e.startTime
    const tags = buildTags(e)
    if (tags.length) item.tags = tags
    if (typeof e.venue?.lat === 'number') item.lat = Number(e.venue.lat.toFixed(2))
    if (typeof e.venue?.lng === 'number') item.lng = Number(e.venue.lng.toFixed(2))
    return item
  })
  return JSON.stringify(out)
}
