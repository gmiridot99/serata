'use client'

import dynamic from 'next/dynamic'
import { Event } from '@/lib/types'

const EventMap = dynamic(() => import('./EventMap'), { ssr: false })

type Props = {
  open: boolean
  onClose: () => void
  events: Event[]
  city?: string | null
  centerLat?: number
  centerLng?: number
  highlightedId: string | null
  onSelect: (event: Event) => void
  isVenueMode?: boolean
  radiusKm?: number
  onRadiusChange?: (km: number) => void
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function MapSheet({
  open,
  onClose,
  events,
  city,
  centerLat,
  centerLng,
  highlightedId,
  onSelect,
  isVenueMode,
  radiusKm,
  onRadiusChange,
}: Props) {
  if (!open) return null

  return (
    <>
      {/* Mobile backdrop */}
      <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Sheet — mobile: full screen slide-up; desktop: right 60% slide-right */}
      <div className={[
        'fixed inset-0 z-50 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[60%]',
        'bg-bg flex flex-col',
        'animate-slide-up md:animate-slide-right',
      ].join(' ')}>
        {/* drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border-md" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-medium text-bright">Mappa</span>
          <button
            onClick={onClose}
            aria-label="Chiudi mappa"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-elev transition-colors text-text"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <EventMap
            events={events}
            city={city}
            centerLat={centerLat}
            centerLng={centerLng}
            highlightedId={highlightedId}
            onSelect={onSelect}
            isVenueMode={isVenueMode}
            radiusKm={radiusKm}
            onRadiusChange={onRadiusChange}
            className="h-full"
          />
        </div>
      </div>
    </>
  )
}
