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
