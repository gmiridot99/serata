// src/components/SplitView.tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'
import EventGrid from './EventGrid'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  events: Event[]
  loading: boolean
  city?: string | null
  highlightedId: string | null
  onCardHover: (id: string | null) => void
  onSelect: (event: Event) => void
}

type MobileView = 'grid' | 'map'

export default function SplitView({ events, loading, city, highlightedId, onCardHover, onSelect }: Props) {
  const [mobileView, setMobileView] = useState<MobileView>('grid')

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile toggle */}
      <div className="flex md:hidden gap-2 p-3 bg-bg-card border-b border-white/10">
        <button
          onClick={() => setMobileView('grid')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileView === 'grid'
              ? 'bg-accent text-white'
              : 'bg-bg text-text-muted hover:text-text'
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mobileView === 'map'
              ? 'bg-accent text-white'
              : 'bg-bg text-text-muted hover:text-text'
          }`}
        >
          Mappa
        </button>
      </div>

      {/* Mobile: single view */}
      <div className="md:hidden flex-1">
        {mobileView === 'grid' ? (
          <div className="p-4">
            <EventGrid
              events={events}
              highlightedId={highlightedId}
              onCardHover={onCardHover}
              onSelect={onSelect}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-160px)]">
            <EventMap
              events={events}
              city={city}
              highlightedId={highlightedId}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto p-6">
          <EventGrid
            events={events}
            highlightedId={highlightedId}
            onCardHover={onCardHover}
            onSelect={onSelect}
          />
        </div>
        <div className="w-1/2 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <EventMap
            events={events}
            highlightedId={highlightedId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  )
}
