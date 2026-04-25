'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

type Venue = {
  name: string
  address: string
  lat: number
  lng: number
}

type Props = {
  venue: Venue
  className?: string
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
]

export default function EventMiniMap({ venue, className }: Props) {
  if (venue.lat === 0 && venue.lng === 0) return null

  return (
    <div
      className={`h-64 w-full rounded-xl overflow-hidden${className ? ` ${className}` : ''}`}
      style={{ minHeight: '256px' }}
    >
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: venue.lat, lng: venue.lng }}
          defaultZoom={15}
          styles={DARK_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <AdvancedMarker position={{ lat: venue.lat, lng: venue.lng }}>
            <Pin background="#e94560" borderColor="#e94560" glyphColor="#ffffff" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  )
}
