'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Event, EventCategory, EventPrice } from '@/lib/types'

const EventMiniMap = dynamic(() => import('./EventMiniMap'), { ssr: false })

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club: 'Club',
  concert: 'Concerto',
  aperitivo: 'Aperitivo',
  theatre: 'Teatro',
  other: 'Altro',
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club: 'bg-purple-600',
  concert: 'bg-blue-600',
  aperitivo: 'bg-orange-500',
  theatre: 'bg-green-600',
  other: 'bg-gray-600',
}

function formatPrice(price: EventPrice): string {
  if (price === 'free') return 'Gratuito'
  if (price.min === price.max) return `€${price.min}`
  return `€${price.min} – €${price.max}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type Props = {
  event: Event | null
  onClose: () => void
}

export default function EventDetailModal({ event, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!event) return null

  const isPlace = event.source === 'places'
  const hasCoords = event.venue.lat !== 0 || event.venue.lng !== 0
  const categoryColor = CATEGORY_COLORS[event.category] ?? 'bg-gray-600'
  const categoryLabel = CATEGORY_LABELS[event.category] ?? event.category

  return (
    <>
      {/* Backdrop (mobile: closes on tap; desktop: decorative) */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:bg-transparent"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, slide-over on desktop */}
      <div
        className={[
          'fixed z-50 bg-bg overflow-y-auto',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl animate-slide-up',
          // Desktop: right slide-over
          'md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-screen md:rounded-none md:animate-slide-right',
        ].join(' ')}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors"
        >
          ✕
        </button>

        {/* Hero image */}
        <div className="relative h-48 w-full overflow-hidden shrink-0">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bg-card to-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <span
            className={`absolute bottom-3 left-4 ${categoryColor} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-bold text-text leading-snug">{event.title}</h2>

          {/* Date + time only for non-place events */}
          {!isPlace && event.startTime && (
            <>
              <div className="flex items-start gap-2 text-sm text-text">
                <span>📅</span>
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-text">
                <span>🕐</span>
                <span>
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ''}
                </span>
              </div>
            </>
          )}

          <div className="flex items-start gap-2 text-sm text-text">
            <span>📍</span>
            <span>
              {event.venue.name}
              {event.venue.address ? `, ${event.venue.address}` : ''}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm text-text">
            <span>💰</span>
            <span>{formatPrice(event.price)}</span>
          </div>

          {event.description && (
            <p className="text-text-muted text-sm leading-relaxed">{event.description}</p>
          )}

          {/* Mini-map */}
          {hasCoords && <EventMiniMap venue={event.venue} />}

          {/* CTA */}
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-accent text-white text-center py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {isPlace ? 'Apri in Google Maps →' : 'Compra biglietti →'}
          </a>
        </div>
      </div>
    </>
  )
}
