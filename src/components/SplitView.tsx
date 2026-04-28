'use client'

import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'
import EventList from './EventList'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  events: Event[]
  loading: boolean
  city?: string | null
  highlightedId: string | null
  onCardHover: (id: string | null) => void
  onSelect: (event: Event) => void
  mobileTab?: 'events' | 'map' | 'venues'
  isVenueMode?: boolean
  radiusKm?: number
  onRadiusChange?: (km: number) => void
}

export default function SplitView({
  events,
  loading,
  city,
  highlightedId,
  onCardHover,
  onSelect,
  mobileTab = 'events',
  isVenueMode = false,
  radiusKm,
  onRadiusChange,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showMap = mobileTab === 'map'

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile: single view based on mobileTab */}
      <div className="md:hidden flex-1 overflow-hidden">
        {showMap ? (
          <EventMap
            events={events}
            city={city}
            highlightedId={highlightedId}
            onSelect={onSelect}
            isVenueMode={isVenueMode}
            radiusKm={radiusKm}
            onRadiusChange={onRadiusChange}
            className="h-full"
          />
        ) : (
          <div className="h-full overflow-y-auto px-4 py-4">
            <EventList
              events={events}
              highlightedId={highlightedId}
              onCardHover={onCardHover}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[420px] shrink-0 overflow-y-auto px-5 py-5 border-r border-border">
          <EventList
            events={events}
            highlightedId={highlightedId}
            onCardHover={onCardHover}
            onSelect={onSelect}
          />
        </div>
        <div className="flex-1 overflow-hidden relative">
          <EventMap
            events={events}
            city={city}
            highlightedId={highlightedId}
            onSelect={onSelect}
            isVenueMode={isVenueMode}
            radiusKm={radiusKm}
            onRadiusChange={onRadiusChange}
          />
        </div>
      </div>
    </div>
  )
}
