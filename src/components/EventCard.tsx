'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Event } from '@/lib/types'

const CAT_COLORS: Record<string, string> = {
  club:      '#8b5cf6',
  concert:   '#3b82f6',
  aperitivo: '#f97316',
  theatre:   '#10b981',
  other:     '#6b7280',
}

function formatPrice(price: Event['price']): { text: string; free: boolean } {
  if (price === 'free') return { text: 'gratis', free: true }
  if (price.min === price.max) return { text: `€${price.min}`, free: false }
  return { text: `€${price.min}–€${price.max}`, free: false }
}

type Props = {
  event: Event
  distanceKm?: number
  highlighted?: boolean
  onHover?: () => void
  onHoverEnd?: () => void
  onClick?: () => void
}

export default function EventCard({ event, distanceKm, highlighted, onHover, onHoverEnd, onClick }: Props) {
  const { text: priceDisplay, free: isFree } = formatPrice(event.price)
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!event.imageUrl && !imgFailed
  const catColor = CAT_COLORS[event.category] ?? CAT_COLORS.other
  const isVenue = event.source === 'places'

  const distLabel = distanceKm != null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m`
      : `${distanceKm.toFixed(1)}km`
    : null

  return (
    <div
      className={`flex gap-3 items-center py-3 border-b border-border cursor-pointer hover:bg-elev/50 transition-colors rounded-xl px-2 -mx-2${highlighted ? ' ring-2 ring-accent' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      {/* Thumb */}
      <div className="w-[84px] h-[84px] rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-elev2 to-bg">
        {showImage ? (
          <Image
            src={event.imageUrl!}
            alt={event.title}
            width={84}
            height={84}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        {/* Row 1: time + price */}
        <div className="flex items-baseline justify-between gap-2">
          {isVenue ? (
            <span className="font-display font-bold text-[18px] text-text truncate">{event.venue.name}</span>
          ) : (
            <span className="font-display font-bold text-[18px] text-text">
              {event.startTime}
              {event.endTime && <span className="text-muted font-normal text-[14px]"> → {event.endTime}</span>}
            </span>
          )}
          {!isVenue && (
            <span className={`text-[13px] font-semibold shrink-0 ${isFree ? 'text-green' : 'text-accent'}`}>
              {priceDisplay}
            </span>
          )}
          {isVenue && event.rating && (
            <span className="text-[13px] font-semibold text-accent shrink-0">★ {event.rating}</span>
          )}
        </div>

        {/* Row 2: title */}
        <p className="text-[13px] font-medium text-text truncate">{event.title}</p>

        {/* Row 3: category dot + venue + km */}
        <div className="flex items-center gap-1.5 text-[11px] text-bright">
          <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: catColor }} />
          <span className="truncate">{event.venue.name}</span>
          {distLabel && <span className="shrink-0">· {distLabel}</span>}
        </div>
      </div>
    </div>
  )
}
