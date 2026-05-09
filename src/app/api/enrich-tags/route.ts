import { NextResponse } from 'next/server'
import { enrichTags } from '@/lib/enrichTags'
import type { Event } from '@/lib/types'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { events } = body as { events?: unknown }

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'events array required' }, { status: 400 })
  }

  try {
    const tagsMap = await enrichTags(events as Event[])
    // Serialize Map to array since Maps don't serialize to JSON
    const tags = Array.from(tagsMap.entries()).map(([id, t]) => ({ id, ...t }))
    return NextResponse.json({ tags })
  } catch (err) {
    console.error('[enrich-tags] error:', err)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
