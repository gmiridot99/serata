'use client'

import { useEffect, useRef } from 'react'
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

export default function EventMap({ events, highlightedId, onPinClick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return

    import('leaflet').then((mod) => {
      const L = mod.default ?? mod

      if (mapRef.current) return // already initialized

      const map = L.map(containerRef.current!)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Default view; fitBounds will fire in markers effect once events load
      map.setView([42, 12.5], 6)

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = []
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers when events or highlightedId change
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((mod) => {
      const L = mod.default ?? mod
      const map = mapRef.current
      if (!map) return

      // Remove old markers
      for (const marker of markersRef.current) {
        marker.remove()
      }
      markersRef.current = []

      // Only render markers for events with valid coordinates
      const mappableEvents = events.filter(
        (e) => e.venue.lat !== 0 || e.venue.lng !== 0
      )

      // Add new markers
      for (const event of mappableEvents) {
        const isHighlighted = event.id === highlightedId
        const marker = L.circleMarker([event.venue.lat, event.venue.lng], {
          radius: isHighlighted ? 12 : 8,
          fillColor: CATEGORY_COLORS[event.category],
          color: isHighlighted ? '#ffffff' : CATEGORY_COLORS[event.category],
          weight: isHighlighted ? 2 : 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.on('click', () => onPinClick?.(event.id))
        markersRef.current.push(marker)
      }

      // Fit bounds to mappable events, fallback to Italy view
      if (mappableEvents.length > 0) {
        const bounds = L.latLngBounds(
          mappableEvents.map((e) => [e.venue.lat, e.venue.lng])
        )
        map.fitBounds(bounds)
      } else {
        map.setView([42, 12.5], 6)
      }
    })
  }, [events, highlightedId, onPinClick])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full${className ? ` ${className}` : ''}`}
    />
  )
}
