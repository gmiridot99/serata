import type { Event, EventType, Setting, TimeOfDay } from '@/lib/types'
import type { TagCache } from '@/lib/tagCache'
import { deriveTimeOfDay, extractRuleTags } from '@/lib/vibeTags'

export interface VibeFilterInput {
  timeOfDay?: TimeOfDay[]
  eventType?: EventType[]
  setting?: Setting
}

function eventTypeFor(event: Event, cache: TagCache): EventType[] {
  const cached = cache.get(event.id)?.eventType
  if (cached && cached.length > 0) return cached
  return extractRuleTags(event).eventType ?? []
}

function settingFor(event: Event, cache: TagCache): Setting | undefined {
  return cache.get(event.id)?.setting
}

export function filterEvents(
  events: Event[],
  filters: VibeFilterInput,
  cache: TagCache
): Event[] {
  return events.filter(event => {
    if (filters.timeOfDay && filters.timeOfDay.length > 0) {
      const tod = deriveTimeOfDay(event.startTime)
      if (!filters.timeOfDay.includes(tod)) return false
    }

    if (filters.eventType && filters.eventType.length > 0) {
      const types = eventTypeFor(event, cache)
      const overlap = types.some(t => filters.eventType!.includes(t))
      if (!overlap) return false
    }

    if (filters.setting) {
      const s = settingFor(event, cache)
      if (s !== filters.setting) return false
    }

    return true
  })
}
