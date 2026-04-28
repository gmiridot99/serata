'use client'

import { useEffect, useRef, useState } from 'react'
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Event, EventCategory } from '@/lib/types'

type Props = {
  events: Event[]
  city?: string | null
  highlightedId?: string | null
  onSelect?: (event: Event) => void
  className?: string
  isVenueMode?: boolean
  radiusKm?: number
  onRadiusChange?: (km: number) => void
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: '#7c3aed',
  concert: '#2563eb',
  aperitivo: '#f97316',
  theatre: '#16a34a',
  other: '#6b7280',
}

export default function EventMap({
  events, city, highlightedId, onSelect, className,
  isVenueMode, radiusKm = 10, onRadiusChange,
}: Props) {
  const mappableEvents = events.filter((e) => e.venue.lat !== 0 || e.venue.lng !== 0)

  const defaultCenter =
    mappableEvents.length > 0
      ? { lat: mappableEvents[0].venue.lat, lng: mappableEvents[0].venue.lng }
      : { lat: 42, lng: 12.5 }

  const defaultZoom = mappableEvents.length > 0 ? 12 : 6

  // local state for smooth slider dragging — debounce the actual fetch
  const [localRadius, setLocalRadius] = useState(radiusKm)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync when prop changes externally (URL load, location change)
  useEffect(() => { setLocalRadius(radiusKm) }, [radiusKm])

  function handleSlider(v: number) {
    setLocalRadius(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onRadiusChange?.(v), 300)
  }

  const trackPct = ((localRadius - 1) / (50 - 1)) * 100

  return (
    <div
      className={`w-full h-full relative${className ? ` ${className}` : ''}`}
      style={{ height: '100%', minHeight: '400px' }}
    >
      {/* count pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
        bg-bg/80 backdrop-blur-md border border-border rounded-full
        px-3 py-1.5 text-xs font-semibold text-text pointer-events-none">
        {mappableEvents.length} {isVenueMode ? 'locali' : 'eventi'}
      </div>

      {/* radius slider — top-right */}
      {onRadiusChange && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2
          bg-bg/80 backdrop-blur-md border border-border rounded-full px-3 py-2">
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={localRadius}
            onChange={(e) => handleSlider(parseInt(e.target.value))}
            className="radius-slider w-24"
            style={{
              background: `linear-gradient(to right, var(--accent) ${trackPct}%, rgba(240,232,213,0.07) ${trackPct}%)`,
            }}
          />
          <span className="text-[11px] font-semibold text-accent tabular-nums w-9 shrink-0">
            {localRadius}km
          </span>
        </div>
      )}

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
