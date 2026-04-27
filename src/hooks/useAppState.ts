// src/hooks/useAppState.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Event, EventCategory, Location } from '@/lib/types'

export type Filters = {
  mode: 'events' | 'venues'
  date?: string       // 'today' | 'weekend' | 'YYYY-MM-DD'
  free: boolean
  q?: string          // venues mode keyword
  radiusKm: number    // default 10
  category?: EventCategory[]
}

export type GeoStatus = 'pending' | 'granted' | 'denied'

export type AppState = {
  location: Location | null
  events: Event[]
  filters: Filters
  loading: boolean
  geoStatus: GeoStatus
  selectedEvent: Event | null
  highlightedId: string | null
  setLocation: (location: Location) => void
  setFilters: (filters: Filters) => void
  setSelectedEvent: (event: Event | null) => void
  setHighlightedId: (id: string | null) => void
}

function parseFilters(params: URLSearchParams): Filters {
  const modeVal = params.get('mode')
  const dateVal = params.get('date')
  const radiusVal = params.get('radius')
  const catVal = params.get('category')
  return {
    mode: modeVal === 'venues' ? 'venues' : 'events',
    date: dateVal ?? undefined,
    free: params.get('free') === 'true',
    q: params.get('q') ?? undefined,
    radiusKm: Math.max(1, parseInt(radiusVal ?? '10', 10) || 10),
    category: catVal ? (catVal.split(',') as EventCategory[]) : undefined,
  }
}

function parseLocation(params: URLSearchParams): Location | null {
  const city = params.get('city')
  const lat = parseFloat(params.get('lat') ?? '')
  const lng = parseFloat(params.get('lng') ?? '')
  if (!city || isNaN(lat) || isNaN(lng)) return null
  return { name: city, lat, lng }
}

async function apiFetchEvents(location: Location, filters: Filters): Promise<Event[]> {
  const params = new URLSearchParams({
    city: location.name,
    lat: String(location.lat),
    lng: String(location.lng),
    radius: String(filters.radiusKm),
    mode: filters.mode,
  })
  if (filters.date) params.set('date', filters.date)
  if (filters.free) params.set('free', 'true')
  if (filters.q) params.set('q', filters.q)
  if (filters.category?.length) params.set('category', filters.category.join(','))
  const res = await fetch(`/api/events?${params}`)
  if (!res.ok) throw new Error(`events fetch failed: ${res.status}`)
  return res.json()
}

export function useAppState(): AppState {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [location, setLocationState] = useState<Location | null>(
    () => parseLocation(new URLSearchParams(searchParams.toString()))
  )
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFiltersState] = useState<Filters>(
    () => parseFilters(new URLSearchParams(searchParams.toString()))
  )
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('pending')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const locationRef = useRef(location)
  locationRef.current = location
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const updateUrl = useCallback(
    (newLocation: Location | null, newFilters: Filters) => {
      const params = new URLSearchParams()
      if (newLocation) {
        params.set('city', newLocation.name)
        params.set('lat', String(newLocation.lat))
        params.set('lng', String(newLocation.lng))
      }
      params.set('mode', newFilters.mode)
      if (newFilters.date) params.set('date', newFilters.date)
      if (newFilters.free) params.set('free', 'true')
      if (newFilters.q) params.set('q', newFilters.q)
      if (newFilters.radiusKm !== 10) params.set('radius', String(newFilters.radiusKm))
      if (newFilters.category?.length) params.set('category', newFilters.category.join(','))
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [router]
  )

  const loadEvents = useCallback(async (loc: Location, f: Filters) => {
    setLoading(true)
    try {
      const data = await apiFetchEvents(loc, f)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const setLocation = useCallback(
    (newLocation: Location) => {
      setLocationState(newLocation)
      updateUrl(newLocation, filtersRef.current)
      loadEvents(newLocation, filtersRef.current)
    },
    [loadEvents, updateUrl]
  )

  const setFilters = useCallback(
    (newFilters: Filters) => {
      setFiltersState(newFilters)
      if (locationRef.current) {
        updateUrl(locationRef.current, newFilters)
        loadEvents(locationRef.current, newFilters)
      }
    },
    [loadEvents, updateUrl]
  )

  // Geolocation on mount — skip if location already in URL
  useEffect(() => {
    const urlLocation = parseLocation(new URLSearchParams(searchParams.toString()))
    if (urlLocation) {
      setGeoStatus('granted')
      loadEvents(urlLocation, parseFilters(new URLSearchParams(searchParams.toString())))
      return
    }

    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          )
          const data = await res.json()
          if (data.city && data.lat !== null && data.lng !== null) {
            const newLocation: Location = {
              name: data.city,
              lat: data.lat,
              lng: data.lng,
            }
            setGeoStatus('granted')
            setLocationState(newLocation)
            updateUrl(newLocation, filtersRef.current)
            loadEvents(newLocation, filtersRef.current)
          } else {
            setGeoStatus('denied')
          }
        } catch {
          setGeoStatus('denied')
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 10000 }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    location,
    events,
    filters,
    loading,
    geoStatus,
    selectedEvent,
    highlightedId,
    setLocation,
    setFilters,
    setSelectedEvent,
    setHighlightedId,
  }
}
