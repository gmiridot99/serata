// src/components/LocationSearch.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Location } from '@/lib/types'

type Props = {
  value: Location | null
  onLocationSelect: (location: Location) => void
}

export default function LocationSearch({ value, onLocationSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(value?.name ?? '')
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    setInputValue(value?.name ?? '')
  }, [value])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      types: ['(regions)'],
      fields: ['name', 'geometry', 'address_components', 'formatted_address'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.geometry?.location) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const sublocality = place.address_components?.find(
        (c) => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
      )
      const locality = place.address_components?.find((c) =>
        c.types.includes('locality')
      )

      let name: string
      if (sublocality && locality) {
        name = `${sublocality.long_name}, ${locality.long_name}`
      } else if (locality) {
        name = locality.long_name
      } else {
        name = place.name ?? place.formatted_address ?? ''
      }

      if (name) {
        setInputValue(name)
        onLocationSelect({ name, lat, lng })
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onLocationSelect])

  return (
    <div className="relative flex items-center flex-1">
      <svg
        className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Città, quartiere, zona..."
        className="w-full pl-9 pr-4 py-2 bg-bg-card text-text text-sm rounded-xl
                   border border-white/10 focus:outline-none focus:border-accent
                   placeholder:text-text-muted"
      />
    </div>
  )
}
