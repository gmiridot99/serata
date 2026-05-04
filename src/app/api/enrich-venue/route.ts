import { NextResponse } from 'next/server'
import { enrichVenue } from '@/lib/enrichVenue'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { placeId, reviews } = body as { placeId?: unknown; reviews?: unknown }

  if (!placeId || typeof placeId !== 'string') {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  const safeReviews = Array.isArray(reviews) ? (reviews as unknown[]).filter((r): r is string => typeof r === 'string') : []

  try {
    const enrichment = await enrichVenue(placeId, safeReviews)
    return NextResponse.json(enrichment)
  } catch (err) {
    console.error('[enrich-venue] error:', err)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
