import type { Event, EventType, TimeOfDay, VibeTags } from '@/lib/types'

export function deriveTimeOfDay(startTime: string): TimeOfDay {
  const m = /^(\d{2}):/.exec(startTime)
  if (!m) return 'afternoon'
  const h = parseInt(m[1], 10)
  if (isNaN(h)) return 'afternoon'
  if (h >= 23 || h < 6) return 'late'
  if (h >= 21) return 'dinner'
  if (h >= 18) return 'aperitivo'
  return 'afternoon'
}

const SILENT_DISCO_RE = /silent\s*disco/i
const OPEN_MIC_RE = /open\s*mic|jam\s*session/i
const FESTIVAL_RE = /festival/i

export function extractRuleTags(event: Event): VibeTags {
  const types = new Set<EventType>()

  // Special-case overrides by title (mutually exclusive with default mapping)
  if (SILENT_DISCO_RE.test(event.title)) {
    return { eventType: ['silent-disco'] }
  }
  if (OPEN_MIC_RE.test(event.title)) {
    return { eventType: ['open-mic'] }
  }

  const tags = event.sourceTags ?? []

  switch (event.source) {
    case 'dice':
      if (tags.includes('music:dj')) types.add('dj')
      if (tags.includes('music:gig')) types.add('live')
      break
    case 'ra':
      types.add('dj')
      break
    case 'ticketmaster': {
      const hasMusic = tags.some(t => /music/i.test(t))
      if (hasMusic) {
        const isDj = tags.some(t => /dj|dance|electronic/i.test(t))
        types.add(isDj ? 'dj' : 'live')
      }
      break
    }
    case 'eventbrite':
      // EB category 103 = Music. We don't differentiate dj/live from EB tags
      // reliably — leave for LLM unless title gives a hint above.
      break
    default:
      // bandsintown, mock, places, and any future sources fall through here.
      // No rule-based tags — LLM enrichment handles them downstream.
      break
  }

  // Gate intentional: title alone (e.g. Eventbrite "Festival X") doesn't produce
  // festival without at least one other type signal. Keeps festival paired with dj/live.
  if (FESTIVAL_RE.test(event.title) && types.size > 0) {
    types.add('festival')
  }

  if (types.size === 0) return {}
  return { eventType: Array.from(types) }
}
