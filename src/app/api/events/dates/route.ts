import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/sources'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const city = searchParams.get('city')
    if (!city) return NextResponse.json({ error: 'city is required' }, { status: 400 })

    const monthParam = searchParams.get('month') // YYYY-MM
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })
    }

    const [year, month] = monthParam.split('-').map(Number)
    const start = new Date(year, month - 1, 1, 0, 0, 0)
    const end = new Date(year, month, 0, 23, 59, 59)
    const toIso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')

    const query = {
      city,
      dateRange: { start: toIso(start), end: toIso(end) },
    } as Parameters<typeof fetchEvents>[0]

    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    if (latParam && lngParam) {
      query.lat = parseFloat(latParam)
      query.lng = parseFloat(lngParam)
      const radiusParam = searchParams.get('radius')
      if (radiusParam) query.radiusKm = Math.max(1, parseInt(radiusParam, 10))
    }

    const events = await fetchEvents(query)
    const dates = [...new Set(events.map((e) => e.date.slice(0, 10)))]

    return NextResponse.json(dates)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
