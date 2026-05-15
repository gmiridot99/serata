'use client'

import { Event } from '@/lib/types'
import EventCard from './EventCard'
import { haversineKm } from '@/lib/distance'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onCardHover?: (id: string | null) => void
  onSelect?: (event: Event) => void
  userLocation?: { lat: number; lng: number }
}

export default function EventList({ events, highlightedId, onCardHover, onSelect, userLocation }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted text-sm">Nessun evento trovato</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {events.map((event) => {
        const distanceKm = userLocation
          ? haversineKm(userLocation, { lat: event.venue.lat, lng: event.venue.lng })
          : undefined

        return (
          <EventCard
            key={event.id}
            event={event}
            distanceKm={distanceKm}
            highlighted={event.id === highlightedId}
            onHover={() => onCardHover?.(event.id)}
            onHoverEnd={() => onCardHover?.(null)}
            onClick={() => onSelect?.(event)}
          />
        )
      })}
    </div>
  )
}
