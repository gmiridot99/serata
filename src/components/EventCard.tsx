'use client'

import { Event, EventCategory } from '@/lib/types'

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: 'bg-purple-600',
  concert: 'bg-blue-600',
  aperitivo: 'bg-orange-500',
  theatre: 'bg-green-600',
  other: 'bg-gray-600',
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club: 'Club',
  concert: 'Concerto',
  aperitivo: 'Aperitivo',
  theatre: 'Teatro',
  other: 'Altro',
}

type Props = {
  event: Event
  highlighted?: boolean
  onHover?: () => void
  onHoverEnd?: () => void
}

export default function EventCard({ event, highlighted, onHover, onHoverEnd }: Props) {
  const formattedDate = new Date(event.date).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timeRange = event.endTime
    ? `${event.startTime} - ${event.endTime}`
    : event.startTime

  const priceDisplay =
    event.price === 'free'
      ? 'Gratis'
      : event.price.min === event.price.max
      ? `€${event.price.min}`
      : `€${event.price.min} – €${event.price.max}`

  return (
    <div
      className={`bg-bg-card rounded-xl overflow-hidden transition-all ${
        highlighted ? 'ring-2 ring-accent' : ''
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      {/* Image area */}
      <div className="relative aspect-video">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg to-bg-card" />
        )}
        {/* Category badge */}
        <span
          className={`absolute top-2 left-2 ${CATEGORY_COLORS[event.category]} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-1">
        <h3 className="text-lg font-semibold text-text leading-snug">{event.title}</h3>
        <p className="text-sm text-text-muted">
          {formattedDate} · {timeRange}
        </p>
        <p className="text-sm text-text-muted">{event.venue.name}</p>
        <p className="text-sm font-medium text-accent">{priceDisplay}</p>
      </div>
    </div>
  )
}
