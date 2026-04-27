'use client'

import { Event, EventCategory } from '@/lib/types'

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club:      '#8b5cf6',
  concert:   '#3b82f6',
  aperitivo: '#f97316',
  theatre:   '#10b981',
  other:     '#6b7280',
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club:      'Club',
  concert:   'Concerto',
  aperitivo: 'Aperitivo',
  theatre:   'Teatro',
  other:     'Altro',
}

function formatPrice(price: Event['price']): { text: string; free: boolean } {
  if (price === 'free') return { text: 'gratis', free: true }
  if (price.min === price.max) return { text: `€${price.min}`, free: false }
  return { text: `€${price.min}–€${price.max}`, free: false }
}

type Props = {
  event: Event
  variant?: 'featured' | 'row'
  highlighted?: boolean
  onHover?: () => void
  onHoverEnd?: () => void
  onClick?: () => void
}

export default function EventCard({ event, variant = 'row', highlighted, onHover, onHoverEnd, onClick }: Props) {
  const { text: priceDisplay, free: isFree } = formatPrice(event.price)
  const catColor = CATEGORY_COLORS[event.category]

  if (variant === 'featured') {
    return (
      <div
        className={`rounded-2xl overflow-hidden relative h-44 cursor-pointer group${
          highlighted ? ' ring-2 ring-accent' : ''
        }`}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
        onClick={onClick}
      >
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between mb-1">
            <span className="font-display font-black text-3xl text-text tracking-tighter leading-none">
              {event.startTime}
            </span>
            <span className={`text-sm font-bold ${isFree ? 'text-green-400' : 'text-accent'}`}>
              {priceDisplay}
            </span>
          </div>
          <p className="text-sm font-semibold text-text mb-1 truncate">{event.title}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-bright">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColor }} />
            {event.venue.name} · {CATEGORY_LABELS[event.category]}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex gap-3 items-center py-3 border-b border-border cursor-pointer
        last:border-0 hover:bg-elev/50 -mx-1 px-1 rounded-lg transition-colors${
          highlighted ? ' ring-1 ring-accent/40' : ''
        }`}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-display font-bold text-lg text-text tracking-tight leading-none">
            {event.startTime}
          </span>
          {event.endTime && (
            <span className="text-[10px] text-muted">→ {event.endTime}</span>
          )}
        </div>
        <p className="text-[13px] font-medium text-text truncate mb-0.5">{event.title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-bright">
          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: catColor }} />
          {event.venue.name}
        </div>
      </div>
      <span className={`text-xs font-bold shrink-0 ${isFree ? 'text-green-400' : 'text-accent'}`}>
        {priceDisplay}
      </span>
    </div>
  )
}
