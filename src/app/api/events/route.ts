// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/sources'
import type { EventCategory, EventQuery } from '@/lib/types'

const VALID_CATEGORIES = new Set<EventCategory>([
  'club', 'concert', 'aperitivo', 'theatre', 'other',
])

function isValidCategory(v: string): v is EventCategory {
  return VALID_CATEGORIES.has(v as EventCategory)
}

function isValidDate(v: string): boolean {
  return v === 'today' || v === 'weekend' || /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const city = searchParams.get('city')
    if (!city) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const query: EventQuery = { city }

    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    if (latParam && lngParam) {
      query.lat = parseFloat(latParam)
      query.lng = parseFloat(lngParam)
      const radiusParam = searchParams.get('radius')
      if (radiusParam) query.radiusKm = Math.max(1, parseInt(radiusParam, 10))
    }

    const modeParam = searchParams.get('mode')
    if (modeParam === 'events' || modeParam === 'venues') {
      query.mode = modeParam
    }

    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      const parts = categoryParam.split(',').map(s => s.trim()).filter(Boolean)
      const categories = parts.filter(isValidCategory)
      if (categories.length === 1) query.category = categories[0]
      else if (categories.length > 1) query.category = categories
    }

    const dateParam = searchParams.get('date')
    if (dateParam && isValidDate(dateParam)) {
      query.date = dateParam
    }

    if (searchParams.get('free') === 'true') {
      query.free = true
    }

    const q = searchParams.get('q')
    if (q?.trim()) {
      query.q = q.trim()
    }

    const events = await fetchEvents(query)
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
