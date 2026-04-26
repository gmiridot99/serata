import type { Event, EventCategory, EventPrice, EventQuery, EventSource } from '@/lib/types'

type GooglePlace = {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  types: string[]
  photos?: Array<{ name: string; widthPx: number; heightPx: number }>
  googleMapsUri: string
  priceLevel?: string
}

const TYPE_TO_CATEGORY: Record<string, EventCategory> = {
  night_club: 'club',
  cocktail_bar: 'club',
  pub: 'club',
  bar: 'aperitivo',
  wine_bar: 'aperitivo',
  cafe: 'aperitivo',
  restaurant: 'aperitivo',
  performing_arts_theater: 'theatre',
  theater: 'theatre',
  concert_hall: 'concert',
  music_venue: 'concert',
}

const PRICE_MAP: Record<string, EventPrice> = {
  PRICE_LEVEL_FREE: 'free',
  PRICE_LEVEL_INEXPENSIVE: { min: 0, max: 15, currency: 'EUR' },
  PRICE_LEVEL_MODERATE: { min: 15, max: 35, currency: 'EUR' },
  PRICE_LEVEL_EXPENSIVE: { min: 35, max: 70, currency: 'EUR' },
  PRICE_LEVEL_VERY_EXPENSIVE: { min: 70, max: 200, currency: 'EUR' },
}

function mapCategory(types: string[]): EventCategory {
  for (const t of types) {
    const cat = TYPE_TO_CATEGORY[t]
    if (cat) return cat
  }
  return 'other'
}

export function normalizePlaceToEvent(place: GooglePlace, apiKey: string): Event {
  const photo = place.photos?.[0]
  const imageUrl = photo
    ? `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${apiKey}`
    : undefined

  return {
    id: `places_${place.id}`,
    title: place.displayName.text,
    description: place.formattedAddress,
    category: mapCategory(place.types ?? []),
    date: new Date().toISOString(),
    startTime: '',
    venue: {
      name: place.displayName.text,
      address: place.formattedAddress,
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    price: PRICE_MAP[place.priceLevel ?? ''] ?? 'free',
    imageUrl,
    ticketUrl: place.googleMapsUri,
    source: 'places',
  }
}

const FIELDS =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos,places.googleMapsUri,places.priceLevel'

export class PlacesSource implements EventSource {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(query: EventQuery): Promise<Event[]> {
    if (!query.q) return []

    const textQuery = `${query.q} ${query.city}`

    const requestBody: Record<string, unknown> = {
      textQuery,
      languageCode: 'it',
      regionCode: 'IT',
      maxResultCount: 20,
    }

    if (query.lat !== undefined && query.lng !== undefined) {
      requestBody.locationBias = {
        circle: {
          center: { latitude: query.lat, longitude: query.lng },
          radius: (query.radiusKm ?? 10) * 1000,
        },
      }
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELDS,
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) throw new Error(`Places API error: ${res.status}`)

    const data = await res.json()
    const places: GooglePlace[] = data.places ?? []

    let results = places.map((p) => normalizePlaceToEvent(p, this.apiKey))

    if (query.free) {
      results = results.filter((e) => e.price === 'free')
    }

    const cats = Array.isArray(query.category)
      ? query.category
      : query.category
      ? [query.category]
      : []
    if (cats.length > 0) {
      results = results.filter((e) => cats.includes(e.category))
    }

    return results
  }

  async fetchById(id: string): Promise<Event | null> {
    const placeId = id.replace('places_', '')
    const fields = 'id,displayName,formattedAddress,location,types,photos,googleMapsUri,priceLevel'
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${this.apiKey}`
    )
    if (!res.ok) return null
    const place: GooglePlace = await res.json()
    return normalizePlaceToEvent(place, this.apiKey)
  }
}
