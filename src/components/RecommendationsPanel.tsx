'use client'

import type { Event } from '@/lib/types'

type Props = {
  events: Event[]
  reasons: Record<string, string>
  onSelect: (event: Event) => void
  onDismiss: () => void
}

export default function RecommendationsPanel({ events, reasons, onSelect, onDismiss }: Props) {
  if (events.length === 0) return null

  return (
    <div className="border-b border-border bg-elev px-4 md:px-7 py-3 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-accent">
          Serate consigliate
        </h2>
        <button
          onClick={onDismiss}
          className="text-muted hover:text-text text-xs cursor-pointer"
          aria-label="Chiudi consigliate"
        >
          ✕
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {events.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e)}
            className="shrink-0 w-56 text-left rounded-lg border border-border bg-bg
                       px-3 py-2 hover:border-accent transition-colors cursor-pointer"
          >
            <div className="text-sm font-medium truncate">{e.title}</div>
            <div className="text-[11px] text-muted truncate">{e.venue.name}</div>
            {reasons[e.id] && (
              <div className="text-[11px] text-accent mt-1 line-clamp-2">{reasons[e.id]}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
