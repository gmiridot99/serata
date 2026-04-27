'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Event, EventCategory } from '@/lib/types'

type Props = {
  events: Event[]
  city?: string | null
  highlightedId?: string | null
  onSelect?: (event: Event) => void
  className?: string
  isVenueMode?: boolean
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: '#7c3aed',
  concert: '#2563eb',
  aperitivo: '#f97316',
  theatre: '#16a34a',
  other: '#6b7280',
}


export default function EventMap({ events, city, highlightedId, onSelect, className, isVenueMode }: Props) {
  const mappableEvents = events.filter((e) => e.venue.lat !== 0 || e.venue.lng !== 0)

  const defaultCenter =
    mappableEvents.length > 0
      ? { lat: mappableEvents[0].venue.lat, lng: mappableEvents[0].venue.lng }
      : { lat: 42, lng: 12.5 }

  const defaultZoom = mappableEvents.length > 0 ? 12 : 6

  return (
    <div
      className={`w-full h-full relative${className ? ` ${className}` : ''}`}
      style={{ height: '100%', minHeight: '400px' }}
    >
      {/* pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
        bg-bg/80 backdrop-blur-md border border-border rounded-full
        px-3 py-1.5 text-xs font-semibold text-text pointer-events-none">
        {mappableEvents.length} {isVenueMode ? 'locali' : 'eventi'}
      </div>
      <Map
        key={city ?? 'default'}
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {mappableEvents.map((event) => {
          const isHighlighted = event.id === highlightedId
          const bgColor = isHighlighted ? '#f0a020' : CATEGORY_COLORS[event.category]
          return (
            <AdvancedMarker
              key={event.id}
              position={{ lat: event.venue.lat, lng: event.venue.lng }}
              onClick={() => onSelect?.(event)}
              style={isHighlighted ? { transform: 'scale(1.3)', zIndex: 10 } : undefined}
            >
              <Pin background={bgColor} borderColor={bgColor} glyphColor="#ffffff" />
            </AdvancedMarker>
          )
        })}
      </Map>
    </div>
  )
}
