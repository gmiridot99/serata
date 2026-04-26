'use client'

import { Event } from '@/lib/types'
import EventCard from './EventCard'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onCardHover?: (id: string | null) => void
  onSelect?: (event: Event) => void
}

export default function EventGrid({ events, highlightedId, onCardHover, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-text-muted text-lg">Nessun evento trovato</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          highlighted={event.id === highlightedId}
          onHover={() => onCardHover?.(event.id)}
          onHoverEnd={() => onCardHover?.(null)}
          onClick={() => onSelect?.(event)}
        />
      ))}
    </div>
  )
}
