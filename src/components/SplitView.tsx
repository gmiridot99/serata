'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'
import EventGrid from './EventGrid'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  events: Event[]
  highlightedId: string | null
  onCardHover: (id: string | null) => void
  onPinClick: (id: string) => void
}

type MobileView = 'grid' | 'map'

export default function SplitView({ events, highlightedId, onCardHover, onPinClick }: Props) {
  const [mobileView, setMobileView] = useState<MobileView>('grid')

  return (
    <div className="w-full">
      {/* Mobile toggle buttons */}
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
      <div className="md:hidden">
        {mobileView === 'grid' ? (
          <div className="p-4">
            <EventGrid
              events={events}
              highlightedId={highlightedId}
              onCardHover={onCardHover}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-100px)]">
            <EventMap
              events={events}
              highlightedId={highlightedId}
              onPinClick={onPinClick}
            />
          </div>
        )}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex">
        <div className="w-1/2 h-screen overflow-y-auto sticky top-0 p-6">
          <EventGrid
            events={events}
            highlightedId={highlightedId}
            onCardHover={onCardHover}
          />
        </div>
        <div className="w-1/2 h-screen sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
          <EventMap
            events={events}
            highlightedId={highlightedId}
            onPinClick={onPinClick}
          />
        </div>
      </div>
    </div>
  )
}
