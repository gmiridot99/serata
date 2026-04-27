'use client'

import type { Filters } from '@/hooks/useAppState'

type Props = {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (filters: Filters) => void
}

const RADII = [5, 10, 25, 50]

export default function FilterSheet({ open, onClose, filters, onChange }: Props) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 z-50 bg-bg rounded-t-2xl border-t border-border
        animate-slide-up p-6 space-y-6
        md:fixed md:bottom-auto md:inset-x-auto md:right-6 md:top-16
        md:w-72 md:rounded-2xl md:border md:border-border md:animate-none md:shadow-2xl">

        <div className="flex items-center justify-between">
          <span className="font-semibold text-text">Filtri</span>
          <button onClick={onClose} className="text-muted hover:text-text text-sm">✕</button>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Distanza</p>
          <div className="flex gap-2">
            {RADII.map((km) => (
              <button
                key={km}
                onClick={() => onChange({ ...filters, radiusKm: km })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
                  ${filters.radiusKm === km
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-transparent text-muted border-border hover:border-border-md'
                  }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Prezzo</p>
          <div className="flex gap-2">
            {[
              { label: 'Tutti', val: false },
              { label: 'Gratis', val: true },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => onChange({ ...filters, free: opt.val })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
                  ${filters.free === opt.val
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-transparent text-muted border-border hover:border-border-md'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-accent text-bg rounded-xl text-sm font-bold"
        >
          Applica filtri
        </button>
      </div>
    </>
  )
}
