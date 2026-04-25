export type EventCategory = 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'

export type EventPrice =
  | 'free'
  | { min: number; max: number; currency: string }

export type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string       // ISO 8601 UTC
  startTime: string  // "23:00" locale
  endTime?: string   // "04:00" locale
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

export type EventQuery = {
  city: string
  category?: EventCategory | EventCategory[]
  date?: 'today' | 'weekend'
  free?: boolean
}

export interface EventSource {
  fetch(query: EventQuery): Promise<Event[]>
}
