'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Event, EventPrice } from '@/lib/types'

const EventMiniMap = dynamic(() => import('./EventMiniMap'), { ssr: false })

function formatPrice(price: EventPrice): string {
  if (price === 'free') return 'Gratuito'
  if (price.min === price.max) return `€${price.min}`
  return `€${price.min} – €${price.max}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
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

export default function EventDetailPanel({ event, onClose }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => { setImgFailed(false) }, [event?.id])

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
  const showImage = !!event.imageUrl && !imgFailed

  return (
    <div className="hidden md:flex flex-col fixed right-0 top-0 bottom-0 z-50 w-[460px] bg-bg border-l border-border overflow-hidden">
      <div className="flex items-center px-5 py-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-elev transition-colors text-text"
        >
          <ArrowLeftIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative h-[220px] w-full overflow-hidden shrink-0">
          {showImage ? (
            <Image
              src={event.imageUrl!}
              alt={event.title}
              fill
              sizes="460px"
              className="object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-card to-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
          {!isPlace && event.startTime && (
            <span className="absolute bottom-4 left-5 font-display font-black text-5xl text-text tracking-tighter leading-none">
              {event.startTime}
            </span>
          )}
        </div>

        <div className="px-5 pb-24 space-y-4 pt-4">
          <h2 className="text-xl font-bold text-text leading-snug">{event.title}</h2>

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
            <p className="text-bright text-sm leading-relaxed">{event.description}</p>
          )}

          {hasCoords && <EventMiniMap venue={event.venue} />}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg to-transparent pointer-events-none">
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto block w-full bg-accent text-inv text-center py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {isPlace ? 'Apri in Google Maps →' : 'Vai al sito →'}
        </a>
      </div>
    </div>
  )
}
