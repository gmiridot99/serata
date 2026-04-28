'use client'

import { Event } from '@/lib/types'
import EventCard from './EventCard'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onCardHover?: (id: string | null) => void
  onSelect?: (event: Event) => void
}

export default function EventList({ events, highlightedId, onCardHover, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted text-sm">Nessun evento trovato</p>
      </div>
    )
  }

  const [first, ...rest] = events

  return (
    <div>
      <EventCard
        event={first}
        variant="featured"
        highlighted={first.id === highlightedId}
        onHover={() => onCardHover?.(first.id)}
        onHoverEnd={() => onCardHover?.(null)}
        onClick={() => onSelect?.(first)}
      />
      {rest.length > 0 && (
        <div className="mt-2">
          {rest.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="row"
              highlighted={event.id === highlightedId}
              onHover={() => onCardHover?.(event.id)}
              onHoverEnd={() => onCardHover?.(null)}
              onClick={() => onSelect?.(event)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
