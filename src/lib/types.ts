export type EventCategory = 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'

export type EventPrice =
  | 'free'
  | { min: number; max: number; currency: string }

export type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string
  startTime: string
  endTime?: string
  venue: {
    name: string
    address: string
    lat: number
    lng: number
  }
  price: EventPrice
  imageUrl?: string
  ticketUrl: string
  source: string
}

export type Location = {
  name: string   // display label, e.g. "Navigli, Milano" or "Seregno"
  lat: number
  lng: number
}

export type EventQuery = {
  city: string              // display name — always required for labels
  lat?: number              // when present, use coords+radius instead of city string
  lng?: number
  radiusKm?: number         // defaults to 10 when lat/lng present
  category?: EventCategory | EventCategory[]
  date?: string             // 'today' | 'weekend' | 'YYYY-MM-DD'
  q?: string                // venues mode keyword
  mode?: 'events' | 'venues'
}

export interface EventSource {
  fetch(query: EventQuery): Promise<Event[]>
  fetchById?(id: string): Promise<Event | null>
}
