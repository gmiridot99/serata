'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Event, EventPrice } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/categories'

function formatPrice(price: EventPrice): string {
  if (price === 'free') return 'Gratuito'
  if (price.min === price.max) return `€${price.min}`
  return `€${price.min}–€${price.max}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

function ChevLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

type Props = {
  event: Event
  onBack: () => void
  eventIndex?: number
  eventTotal?: number
  distanceKm?: number
}

export default function DesktopDetailPanel({ event, onBack, eventIndex, eventTotal, distanceKm }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => { setImgFailed(false) }, [event.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onBack() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  const isPlace = event.source === 'places'
  const catColor = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other
  const catLabel = CATEGORY_LABELS[event.category] ?? event.category
  const showImage = !!event.imageUrl && !imgFailed
  const priceText = formatPrice(event.price)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back bar */}
      <div className="px-[22px] py-[14px] flex items-center gap-2.5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-[5px] pl-[6px] rounded-full border border-border text-bright text-xs font-medium hover:bg-elev transition-colors"
        >
          <ChevLeftIcon /> torna alla lista
        </button>
        <div className="flex-1" />
        {eventIndex != null && eventTotal != null && (
          <span className="text-[11px] text-muted">{eventIndex} di {eventTotal}</span>
        )}
      </div>

      {/* Hero 200px */}
      <div className="h-[200px] relative shrink-0">
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
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,8,7,0.3) 0%, rgba(8,8,7,0) 40%, var(--bg) 100%)' }}
        />
        <div className="absolute bottom-4 left-[22px] right-[22px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
            <span className="text-[10px] text-white/95 tracking-[1.5px] uppercase font-semibold">
              {catLabel}{!isPlace && event.date ? ` · ${formatDate(event.date)}` : ''}
            </span>
          </div>
          {!isPlace && event.startTime && (
            <div className="font-display font-black text-[44px] text-white leading-none" style={{ letterSpacing: '-1.4px' }}>
              {event.startTime}
            </div>
          )}
          {isPlace && (
            <div className="font-display font-black text-[28px] text-white leading-tight tracking-tight">
              {event.title}
            </div>
          )}
        </div>
      </div>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-[22px] pt-[18px] pb-0">
        {!isPlace && (
          <h2
            className="font-display font-bold text-[22px] text-text leading-snug mb-[14px]"
            style={{ letterSpacing: '-0.5px' }}
          >
            {event.title}
          </h2>
        )}

        {/* Info card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-[14px]">
          {!isPlace && event.startTime && (
            <div className="flex items-center gap-3 p-[12px_14px] border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-accent-lo flex items-center justify-center shrink-0 text-accent">
                <ClockIcon />
              </div>
              <div>
                <div className="text-[9.5px] text-muted tracking-[1px] uppercase mb-0.5">orario</div>
                <div className="text-[12.5px] text-text font-medium">
                  {event.startTime}{event.endTime ? ` → ${event.endTime}` : ''}
                </div>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-3 p-[12px_14px]${!isPlace && event.startTime ? ' border-b border-border' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-accent-lo flex items-center justify-center shrink-0 text-accent">
              <PinIcon />
            </div>
            <div>
              <div className="text-[9.5px] text-muted tracking-[1px] uppercase mb-0.5">dove</div>
              <div className="text-[12.5px] text-text font-medium">
                {event.venue.name}{event.venue.address ? `, ${event.venue.address}` : ''}
              </div>
              {distanceKm != null && (
                <div className="text-[10.5px] text-muted mt-0.5">{distanceKm.toFixed(1)} km</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-[12px_14px]">
            <div className="w-8 h-8 rounded-lg bg-accent-lo flex items-center justify-center shrink-0 text-accent">
              <TagIcon />
            </div>
            <div>
              <div className="text-[9.5px] text-muted tracking-[1px] uppercase mb-0.5">prezzo</div>
              <div className="text-[12.5px] text-text font-medium">
                {priceText}{event.price !== 'free' ? ' in prevendita' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Vibe / source tags */}
        {event.sourceTags && event.sourceTags.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-muted tracking-[1.5px] uppercase mb-2">la vibe</div>
            <div className="flex flex-wrap gap-1.5">
              {event.sourceTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-elev border border-border text-[11px] text-bright">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-bright text-sm leading-relaxed mb-4">{event.description}</p>
        )}
      </div>

      {/* CTA bar */}
      <div className="px-[22px] pb-[18px] pt-[14px] shrink-0 flex gap-2 items-center"
        style={{ background: 'linear-gradient(180deg, transparent, var(--bg) 30%)' }}>
        <button
          aria-label="Salva"
          className="w-10 h-10 rounded-xl bg-elev border border-border-md flex items-center justify-center text-text shrink-0 hover:bg-card transition-colors"
        >
          <HeartIcon />
        </button>
        <button
          aria-label="Condividi"
          className="w-10 h-10 rounded-xl bg-elev border border-border-md flex items-center justify-center text-text shrink-0 hover:bg-card transition-colors"
        >
          <ShareIcon />
        </button>
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-3 rounded-xl bg-accent text-inv flex items-center justify-between text-[13px] font-bold hover:opacity-90 transition-opacity"
        >
          <span>{isPlace ? 'Apri in Google Maps' : `prendi biglietto · ${priceText}`}</span>
          <ArrowRightIcon />
        </a>
      </div>
    </div>
  )
}
