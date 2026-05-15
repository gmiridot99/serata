'use client'

import { useState } from 'react'
import type { EventCategory } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/categories'

const RADIUS_OPTIONS = [5, 10, 25, 50]

const CATS = (Object.keys(CATEGORY_COLORS) as EventCategory[]).map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  color: CATEGORY_COLORS[key],
}))

type Props = {
  open: boolean
  onClose: () => void
  radiusKm: number
  category?: EventCategory[]
  free?: boolean
  onApply: (filters: { radiusKm: number; category: EventCategory[]; free: boolean }) => void
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function FilterSheet({ open, onClose, radiusKm, category = [], free = false, onApply }: Props) {
  const [localRadius, setLocalRadius] = useState(radiusKm)
  const [localCats, setLocalCats] = useState<EventCategory[]>(category)
  const [localFree, setLocalFree] = useState(free)

  if (!open) return null

  function toggleCat(key: EventCategory) {
    setLocalCats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function handleApply() {
    onApply({ radiusKm: localRadius, category: localCats, free: localFree })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" onClick={onClose} />
      <div className="fixed z-50 bg-card border border-border-md rounded-t-2xl md:rounded-2xl
        inset-x-0 bottom-0 md:inset-auto md:right-6 md:top-14 md:w-72 md:bottom-auto
        animate-slide-up md:animate-none">
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-md" />
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[15px] text-text">filtri</span>
            <button onClick={onClose} className="text-muted hover:text-text transition-colors">
              <CloseIcon />
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">distanza</p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  onClick={() => setLocalRadius(km)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors border ${
                    localRadius === km
                      ? 'bg-accent-lo border-accent text-accent'
                      : 'border-border text-bright hover:text-text'
                  }`}
                >
                  {km}km
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((cat) => {
                const active = localCats.includes(cat.key)
                return (
                  <button
                    key={cat.key}
                    onClick={() => toggleCat(cat.key)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium transition-all"
                    style={{
                      borderColor: active ? cat.color + '80' : 'var(--border)',
                      background:  active ? cat.color + '18' : 'transparent',
                      color:       active ? cat.color : 'var(--bright)',
                    }}
                  >
                    <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: cat.color }} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">prezzo</p>
            <div className="flex gap-2">
              {(['tutti', 'gratis'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setLocalFree(opt === 'gratis')}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                    (opt === 'gratis') === localFree
                      ? 'bg-accent-lo border-accent text-accent'
                      : 'border-border text-bright hover:text-text'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleApply}
            className="w-full bg-accent text-inv font-bold py-3 rounded-xl text-[14px] transition-opacity hover:opacity-90"
          >
            applica filtri
          </button>
        </div>
      </div>
    </>
  )
}
