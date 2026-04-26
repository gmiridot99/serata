// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ city: null, lat: null, lng: null }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('latlng', `${lat},${lng}`)
    url.searchParams.set('result_type', 'locality')
    url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

    const res = await fetch(url.toString())
    if (!res.ok) return NextResponse.json({ city: null, lat: null, lng: null })

    const data = await res.json()
    const result = data.results?.[0]
    if (!result) return NextResponse.json({ city: null, lat: null, lng: null })

    const locality = result.address_components?.find(
      (c: { types: string[] }) => c.types.includes('locality')
    )
    const city = locality?.long_name ?? null

    return NextResponse.json({ city, lat: latNum, lng: lngNum })
  } catch {
    return NextResponse.json({ city: null, lat: null, lng: null })
  }
}
