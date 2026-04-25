'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Event, EventCategory } from '@/lib/types'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onPinClick?: (id: string) => void
  className?: string
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: '#7c3aed',
  concert: '#2563eb',
  aperitivo: '#f97316',
  theatre: '#16a34a',
  other: '#6b7280',
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

export default function EventMap({ events, highlightedId, onPinClick, className }: Props) {
  const mappableEvents = events.filter((e) => e.venue.lat !== 0 || e.venue.lng !== 0)

  const defaultCenter =
    mappableEvents.length > 0
      ? { lat: mappableEvents[0].venue.lat, lng: mappableEvents[0].venue.lng }
      : { lat: 42, lng: 12.5 }

  const defaultZoom = mappableEvents.length > 0 ? 12 : 6

  return (
    <div
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      style={{ height: '100%', minHeight: '400px' }}
    >
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          styles={DARK_STYLE}
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {mappableEvents.map((event) => {
            const isHighlighted = event.id === highlightedId
            const bgColor = isHighlighted ? '#e94560' : CATEGORY_COLORS[event.category]
            return (
              <AdvancedMarker
                key={event.id}
                position={{ lat: event.venue.lat, lng: event.venue.lng }}
                onClick={() => onPinClick?.(event.id)}
                style={isHighlighted ? { transform: 'scale(1.3)', zIndex: 10 } : undefined}
              >
                <Pin background={bgColor} borderColor={bgColor} glyphColor="#ffffff" />
              </AdvancedMarker>
            )
          })}
        </Map>
      </APIProvider>
    </div>
  )
}
