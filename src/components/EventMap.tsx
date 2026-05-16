'use client'

import { useEffect, useRef, useState } from 'react'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { Event, EventCategory, EventPrice } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/categories'

function priceText(price: EventPrice): string {
  if (price === 'free') return 'gratis'
  if (price.min === price.max) return `€${price.min}`
  return `€${price.min}`
}

type Props = {
  events: Event[]
  city?: string | null
  centerLat?: number
  centerLng?: number
  highlightedId?: string | null
  onSelect?: (event: Event) => void
  className?: string
  isVenueMode?: boolean
  radiusKm?: number
  onRadiusChange?: (km: number) => void
}

export default function EventMap({
  events, city, centerLat, centerLng, highlightedId, onSelect, className,
  isVenueMode, radiusKm = 10, onRadiusChange,
}: Props) {
  const mappableEvents = events.filter((e) => e.venue.lat !== 0 || e.venue.lng !== 0)

  const defaultCenter =
    (centerLat !== undefined && centerLng !== undefined)
      ? { lat: centerLat, lng: centerLng }
      : mappableEvents.length > 0
        ? { lat: mappableEvents[0].venue.lat, lng: mappableEvents[0].venue.lng }
        : { lat: 42, lng: 12.5 }

  const defaultZoom = (centerLat !== undefined || mappableEvents.length > 0) ? 12 : 6

  const [localRadius, setLocalRadius] = useState(radiusKm)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      {/* count pill — top center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
        bg-bg/85 backdrop-blur-md border border-border rounded-full
        px-3 py-1.5 text-xs font-semibold text-text pointer-events-none">
        {mappableEvents.length} {isVenueMode ? 'locali' : 'eventi'} in vista
      </div>

      {/* radius slider — top-right */}
      {onRadiusChange && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2
          bg-bg/85 backdrop-blur-md border border-border rounded-full px-3 py-2">
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
        key={centerLat !== undefined && centerLng !== undefined ? `${centerLat.toFixed(4)},${centerLng.toFixed(4)}` : (city ?? 'default')}
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {mappableEvents.map((event) => {
          const isSelected = event.id === highlightedId
          const catColor = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other
          const catLabel = CATEGORY_LABELS[event.category] ?? event.category

          const isDimmed = !!highlightedId && !isSelected

          return (
            <AdvancedMarker
              key={event.id}
              position={{ lat: event.venue.lat, lng: event.venue.lng }}
              onClick={() => onSelect?.(event)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: isSelected ? '6px 12px 6px 8px' : '5px 11px 5px 7px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  background: isSelected ? 'var(--text)' : 'rgba(8,8,7,0.92)',
                  color: isSelected ? 'var(--bg)' : 'var(--text)',
                  border: `1px solid ${isSelected ? catColor : 'rgba(240,232,213,0.13)'}`,
                  boxShadow: isSelected
                    ? `0 10px 26px ${catColor}55, 0 0 0 4px ${catColor}26`
                    : '0 6px 16px rgba(0,0,0,0.55)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  opacity: isDimmed ? 0.45 : 1,
                  transition: 'all 0.15s ease, opacity 180ms ease',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{
                  width: isSelected ? '8px' : '7px',
                  height: isSelected ? '8px' : '7px',
                  borderRadius: '50%',
                  background: catColor,
                  flexShrink: 0,
                  boxShadow: isSelected ? `0 0 0 2px var(--bg)` : 'none',
                }} />
                {catLabel}
              </div>
            </AdvancedMarker>
          )
        })}
      </Map>
    </div>
  )
}
