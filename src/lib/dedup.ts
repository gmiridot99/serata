import type { Event } from "@/lib/types"

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function deduplicateEvents(events: Event[]): Event[] {
  const seen = new Set<string>()
  const result: Event[] = []

  for (const event of events) {
    const datePrefix = event.date.slice(0, 10)
    const key = `${normalize(event.title)}|${datePrefix}|${normalize(event.venue.name)}`

    if (!seen.has(key)) {
      seen.add(key)
      result.push(event)
    }
  }

  return result
}
