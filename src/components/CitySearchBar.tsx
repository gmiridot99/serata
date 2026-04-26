// src/components/CitySearchBar.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type Props = {
  value: string | null
  onCitySelect: (city: string) => void
}

export default function CitySearchBar({ value, onCitySelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(value ?? '')
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Sync display value when city changes from geolocation
  useEffect(() => {
    setInputValue(value ?? '')
  }, [value])

  // Attach Google Places Autocomplete once the library loads
  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      types: ['(cities)'],
      fields: ['address_components', 'name'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place) return
      const locality = place.address_components?.find((c) =>
        c.types.includes('locality')
      )
      const cityName = locality?.long_name ?? place.name ?? ''
      if (cityName) {
        setInputValue(cityName)
        onCitySelect(cityName)
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onCitySelect])

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
        placeholder="Cerca una città..."
        className="w-full pl-9 pr-4 py-2 bg-bg-card text-text text-sm rounded-xl
                   border border-white/10 focus:outline-none focus:border-accent
                   placeholder:text-text-muted"
      />
    </div>
  )
}
