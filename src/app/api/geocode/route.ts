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
    url.searchParams.set('language', 'it')
    url.searchParams.set('key', process.env.GOOGLE_PLACES_API_KEY ?? '')

    const res = await fetch(url.toString())
    if (!res.ok) return NextResponse.json({ city: null, lat: latNum, lng: lngNum })

    const data = await res.json()
    if (!data.results?.length) return NextResponse.json({ city: null, lat: latNum, lng: lngNum })

    // search all results for the most specific place name
    // priority: locality > sublocality > admin_area_level_3 > admin_area_level_2
    const PRIORITY = [
      'locality',
      'sublocality_level_1',
      'sublocality',
      'administrative_area_level_3',
      'administrative_area_level_2',
    ]

    type Component = { types: string[]; long_name: string }

    for (const type of PRIORITY) {
      for (const result of data.results) {
        const comp = (result.address_components as Component[])?.find((c) =>
          c.types.includes(type)
        )
        if (comp?.long_name) {
          return NextResponse.json({ city: comp.long_name, lat: latNum, lng: lngNum })
        }
      }
    }

    return NextResponse.json({ city: null, lat: latNum, lng: lngNum })
  } catch {
    return NextResponse.json({ city: null, lat: null, lng: null })
  }
}
