'use client'

import { useState } from 'react'
import { Event } from '@/lib/types'
import EventList from '../EventList'
import EventSearch from '../EventSearch'

type SortKey = 'time' | 'distance' | 'price'

type Props = {
  events: Event[]
  highlightedId?: string | null
  onSelect: (event: Event) => void
  onHover?: (id: string | null) => void
  userLocation?: { lat: number; lng: number }
  isVenueMode?: boolean
  onSearch?: (q: string) => void
  searchLoading?: boolean
}

function sortedEvents(events: Event[], sort: SortKey): Event[] {
  if (sort === 'time') return events
  if (sort === 'price') {
    return [...events].sort((a, b) => {
      const pa = a.price === 'free' ? 0 : a.price.min
      const pb = b.price === 'free' ? 0 : b.price.min
      return pa - pb
    })
  }
  return events
}

const SORT_LABELS: Record<SortKey, string> = { time: 'orario', distance: 'distanza', price: 'prezzo' }

export default function DesktopListPanel({
  events, highlightedId, onSelect, onHover, userLocation, isVenueMode, onSearch, searchLoading,
}: Props) {
  const [sort, setSort] = useState<SortKey>('time')

  const count = events.length
  const noun = isVenueMode ? (count === 1 ? 'locale' : 'locali') : (count === 1 ? 'serata' : 'serate')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="px-[22px] pt-[18px] pb-3 flex items-baseline gap-2 border-b border-border shrink-0">
        <span className="font-display font-bold text-[22px] text-text tracking-tight leading-none">
          stasera,&nbsp;<span className="text-accent">{count}</span>&nbsp;{noun}
        </span>
        <div className="flex-1" />
        {/* Sort pills */}
        <div className="flex gap-0.5 p-[3px] bg-elev rounded-lg border border-border">
          {(['time', 'distance', 'price'] as SortKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={[
                'px-2 py-[3px] rounded-md text-[10.5px] font-semibold transition-colors',
                sort === s ? 'bg-bg text-text' : 'text-muted hover:text-bright',
              ].join(' ')}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      {onSearch && (
        <div className="px-[22px] pt-2.5 pb-1.5 shrink-0">
          <EventSearch onSubmit={onSearch} loading={searchLoading} />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-[22px] pt-2 pb-[22px]">
        <EventList
          events={sortedEvents(events, sort)}
          highlightedId={highlightedId}
          onCardHover={onHover}
          onSelect={onSelect}
          userLocation={userLocation}
        />
      </div>
    </div>
  )
}
