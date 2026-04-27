'use client'

import LocationSearch from './LocationSearch'
import type { Location } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (location: Location) => void
  onUseMyLocation: () => void
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

const QUICK_CITIES = ['Milano', 'Roma', 'Torino', 'Bologna', 'Firenze', 'Napoli']

export default function LocationOverlay({ open, onClose, onSelect, onUseMyLocation }: Props) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 top-0 z-50 bg-bg border-b border-border
        md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-10
        md:w-[480px] md:rounded-2xl md:border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-black text-lg text-accent">serata</span>
            <button onClick={onClose} className="text-muted hover:text-text text-sm">✕</button>
          </div>

          <LocationSearch
            value={null}
            onLocationSelect={(loc) => { onSelect(loc); onClose() }}
          />

          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_CITIES.map((city) => (
              <button
                key={city}
                className="px-4 py-2 rounded-xl bg-elev border border-border
                  text-sm text-text hover:border-border-md transition-colors"
                onClick={() => { onSelect({ name: city, lat: 0, lng: 0 }); onClose() }}
              >
                {city}
              </button>
            ))}
          </div>

          <button
            onClick={() => { onUseMyLocation(); onClose() }}
            className="mt-3 w-full flex items-center gap-3 p-3 rounded-xl
              bg-elev border border-border hover:border-border-md transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-lo flex items-center justify-center shrink-0">
              <PinIcon className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text">Usa la mia posizione</p>
              <p className="text-xs text-muted">Trova eventi nelle vicinanze</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
