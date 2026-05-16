'use client'

import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'

const EventMap = dynamic(() => import('../EventMap'), { ssr: false })

type Props = {
  events: Event[]
  city?: string | null
  centerLat?: number
  centerLng?: number
  highlightedId: string | null
  onSelect: (event: Event) => void
  isVenueMode?: boolean
  fullscreen: boolean
  onToggleFullscreen: () => void
}

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

function ChevLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function DesktopMapPanel({
  events, city, centerLat, centerLng, highlightedId, onSelect, isVenueMode, fullscreen, onToggleFullscreen,
}: Props) {
  return (
    <div className="flex-1 p-[14px] bg-bg min-w-0">
      <div className="relative w-full h-full rounded-[14px] overflow-hidden border border-border-md bg-[#0f0e0c]">
        <EventMap
          events={events}
          city={city}
          centerLat={centerLat}
          centerLng={centerLng}
          highlightedId={highlightedId}
          onSelect={onSelect}
          isVenueMode={isVenueMode}
          className="h-full"
        />

        {/* Expand / collapse toggle — top right */}
        <div className="absolute top-[14px] right-[14px] z-20 pointer-events-none">
          <button
            onClick={onToggleFullscreen}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-[7px] rounded-full text-[11.5px] font-semibold text-text cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: 'rgba(8,8,7,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(240,232,213,0.18)' }}
          >
            {fullscreen ? (
              <><ChevLeftIcon /> mostra lista</>
            ) : (
              <><ExpandIcon /> espandi mappa</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
