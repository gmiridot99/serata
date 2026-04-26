// src/hooks/useAppState.ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Event } from '@/lib/types'

export type Filters = {
  date?: 'today' | 'weekend'
  free: boolean
  q?: string
}

export type GeoStatus = 'pending' | 'granted' | 'denied'

export type AppState = {
  city: string | null
  events: Event[]
  filters: Filters
  loading: boolean
  geoStatus: GeoStatus
  selectedEvent: Event | null
  highlightedId: string | null
  setCity: (city: string) => void
  setFilters: (filters: Filters) => void
  setSelectedEvent: (event: Event | null) => void
  setHighlightedId: (id: string | null) => void
}

async function apiFetchEvents(city: string, filters: Filters): Promise<Event[]> {
  const params = new URLSearchParams({ city })
  if (filters.date) params.set('date', filters.date)
  if (filters.free) params.set('free', 'true')
  if (filters.q) params.set('q', filters.q)
  const res = await fetch(`/api/events?${params}`)
  if (!res.ok) throw new Error(`events fetch failed: ${res.status}`)
  return res.json()
}

export function useAppState(): AppState {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [city, setCityState] = useState<string | null>(
    searchParams.get('city') || null
  )
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFiltersState] = useState<Filters>({
    date: (searchParams.get('date') as 'today' | 'weekend' | null) ?? undefined,
    free: searchParams.get('free') === 'true',
    q: searchParams.get('q') ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('pending')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const updateUrl = useCallback(
    (newCity: string | null, newFilters: Filters) => {
      const params = new URLSearchParams()
      if (newCity) params.set('city', newCity)
      if (newFilters.date) params.set('date', newFilters.date)
      if (newFilters.free) params.set('free', 'true')
      if (newFilters.q) params.set('q', newFilters.q)
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/', { scroll: false })
    },
    [router]
  )

  const loadEvents = useCallback(async (newCity: string, newFilters: Filters) => {
    setLoading(true)
    try {
      const data = await apiFetchEvents(newCity, newFilters)
      setEvents(data)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const setCity = useCallback(
    (newCity: string) => {
      setCityState(newCity)
      setFiltersState((prev) => {
        updateUrl(newCity, prev)
        loadEvents(newCity, prev)
        return prev
      })
    },
    [loadEvents, updateUrl]
  )

  const setFilters = useCallback(
    (newFilters: Filters) => {
      setFiltersState(newFilters)
      setCityState((prev) => {
        if (prev) {
          updateUrl(prev, newFilters)
          loadEvents(prev, newFilters)
        }
        return prev
      })
    },
    [loadEvents, updateUrl]
  )

  // Geolocation on mount — skip if city already in URL
  useEffect(() => {
    const urlCity = searchParams.get('city')
    if (urlCity) {
      setGeoStatus('granted')
      loadEvents(urlCity, {
        date: (searchParams.get('date') as 'today' | 'weekend' | null) ?? undefined,
        free: searchParams.get('free') === 'true',
        q: searchParams.get('q') ?? undefined,
      })
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
          if (data.city) {
            setGeoStatus('granted')
            setCityState(data.city)
            updateUrl(data.city, filters)
            loadEvents(data.city, filters)
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
    city,
    events,
    filters,
    loading,
    geoStatus,
    selectedEvent,
    highlightedId,
    setCity,
    setFilters,
    setSelectedEvent,
    setHighlightedId,
  }
}
