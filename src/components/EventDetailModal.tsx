'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Event, EventCategory, EventPrice } from '@/lib/types'
import type { VenueEnrichment } from '@/lib/enrichVenue'

const EventMiniMap = dynamic(() => import('./EventMiniMap'), { ssr: false })

const CATEGORY_LABELS: Record<EventCategory, string> = {
  club: 'Club',
  concert: 'Concerto',
  aperitivo: 'Aperitivo',
  theatre: 'Teatro',
  other: 'Altro',
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  club:      '#8b5cf6',
  concert:   '#3b82f6',
  aperitivo: '#f97316',
  theatre:   '#10b981',
  other:     '#6b7280',
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

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PriceIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

type Props = {
  event: Event | null
  onClose: () => void
}

type EnrichStatus = 'idle' | 'loading' | 'done' | 'error'

export default function EventDetailModal({ event, onClose }: Props) {
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus>('idle')
  const [enrichment, setEnrichment] = useState<VenueEnrichment | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!event || event.source !== 'places') return
    setEnrichStatus('loading')
    setEnrichment(null)
    const placeId = event.id.replace('places_', '')
    fetch('/api/enrich-venue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, reviews: event.reviews ?? [] }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json() as Promise<VenueEnrichment>
      })
      .then((data) => {
        setEnrichment(data)
        setEnrichStatus('done')
      })
      .catch(() => setEnrichStatus('error'))
  }, [event])

  if (!event) return null

  const isPlace = event.source === 'places'
  const hasCoords = event.venue.lat !== 0 || event.venue.lng !== 0
  const catColor = CATEGORY_COLORS[event.category]
  const catLabel = CATEGORY_LABELS[event.category] ?? event.category

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 md:bg-transparent md:pointer-events-none"
        onClick={onClose}
      />
      <div
        className={[
          'fixed z-50 bg-bg overflow-y-auto',
          'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl animate-slide-up',
          'md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-[420px] md:h-screen md:rounded-none md:animate-slide-right',
        ].join(' ')}
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-card flex items-center justify-center text-muted hover:text-text transition-colors"
        >
          ✕
        </button>

        {/* Hero */}
        <div className="relative h-56 w-full overflow-hidden shrink-0">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />

          {/* Large time */}
          {!isPlace && event.startTime && (
            <span className="absolute bottom-16 left-4 font-display font-black text-5xl text-text tracking-tighter leading-none">
              {event.startTime}
            </span>
          )}

          {/* Category badge */}
          <span
            className="absolute bottom-4 left-4 text-white text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: catColor }}
          >
            {catLabel}
          </span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <h2 className="text-xl font-bold text-text leading-snug">{event.title}</h2>

          {isPlace && event.rating && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text">⭐ {event.rating}</span>
              {event.reviewCount && (
                <span className="text-sm text-muted">· {event.reviewCount} recensioni</span>
              )}
            </div>
          )}

          <div className="bg-card rounded-2xl p-4 divide-y divide-border">
            {!isPlace && event.startTime && (
              <>
                <div className="flex items-center gap-3 pb-3">
                  <CalendarIcon />
                  <span className="text-sm text-text">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <ClockIcon />
                  <span className="text-sm text-text">
                    {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                  </span>
                </div>
              </>
            )}
            <div className={`flex items-center gap-3 ${!isPlace && event.startTime ? 'py-3' : 'pb-3'}`}>
              <PinIcon />
              <span className="text-sm text-text">
                {event.venue.name}{event.venue.address ? `, ${event.venue.address}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-3">
              <PriceIcon />
              <span className="text-sm text-text">{formatPrice(event.price)}</span>
            </div>
          </div>

          {event.description && (
            <p className="text-muted text-sm leading-relaxed">{event.description}</p>
          )}

          {isPlace && enrichStatus === 'loading' && (
            <div className="bg-card rounded-2xl p-4 space-y-2">
              <div className="h-3 bg-elev rounded-full w-full animate-pulse" />
              <div className="h-3 bg-elev rounded-full w-3/4 animate-pulse" />
            </div>
          )}

          {isPlace && enrichStatus === 'done' && enrichment && (
            <div className="space-y-3">
              {enrichment.summary_it && (
                <p className="text-sm text-muted leading-relaxed">{enrichment.summary_it}</p>
              )}
              {enrichment.vibe.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {enrichment.vibe.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {enrichment.best_for.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {enrichment.best_for.map((tag) => (
                    <span
                      key={tag}
                      className="bg-card text-bright text-xs px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasCoords && <EventMiniMap venue={event.venue} />}

          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-accent text-bg text-center py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {isPlace ? 'Apri in Google Maps →' : 'Compra biglietti →'}
          </a>
        </div>
      </div>
    </>
  )
}
