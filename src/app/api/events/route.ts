import { NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/sources'
import type { EventCategory, EventQuery } from '@/lib/types'

const VALID_CATEGORIES = new Set<EventCategory>([
  'club', 'concert', 'aperitivo', 'theatre', 'other',
])

function isValidCategory(v: string): v is EventCategory {
  return VALID_CATEGORIES.has(v as EventCategory)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city')
    if (!city) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const query: EventQuery = { city }

    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      const parts = categoryParam.split(',').map(s => s.trim()).filter(Boolean)
      const categories = parts.filter(isValidCategory)
      if (categories.length === 1) {
        query.category = categories[0]
      } else if (categories.length > 1) {
        query.category = categories
      }
    }

    const dateParam = searchParams.get('date')
    if (dateParam === 'today' || dateParam === 'weekend') {
      query.date = dateParam
    }

    const freeParam = searchParams.get('free')
    if (freeParam === 'true') {
      query.free = true
    }

    const events = await fetchEvents(query)
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
