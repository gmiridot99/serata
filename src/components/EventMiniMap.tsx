'use client'

import { useEffect, useRef } from 'react'

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

export default function EventMiniMap({ venue, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (venue.lat === 0 && venue.lng === 0) return

    import('leaflet').then((mod) => {
      const L = mod.default ?? mod

      if (mapRef.current) return // already initialized

      const map = L.map(containerRef.current!, { zoomControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      map.setView([venue.lat, venue.lng], 15)

      L.circleMarker([venue.lat, venue.lng], {
        radius: 10,
        fillColor: '#e94560',
        color: '#e94560',
        weight: 2,
        fillOpacity: 0.9,
      })
        .bindPopup(venue.name)
        .addTo(map)

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (venue.lat === 0 && venue.lng === 0) return null

  return (
    <div
      ref={containerRef}
      className={`h-64 w-full rounded-xl overflow-hidden${className ? ` ${className}` : ''}`}
    />
  )
}
