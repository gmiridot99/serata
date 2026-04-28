'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Pill = { label: string; sublabel: string; value: string }

function buildPills(): Pill[] {
  const now = new Date()
  const pills: Pill[] = []
  pills.push({
    label: 'stasera',
    sublabel: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    value: 'today',
  })
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    pills.push({
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }).toLowerCase(),
      sublabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      value: toLocalIsoDate(d),
    })
  }
  return pills
}

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

type LocationInfo = { city: string; lat?: number; lng?: number; radiusKm?: number }

function CalendarPopover({
  value,
  onChange,
  onClose,
  eventDates: initialEventDates,
  location,
}: {
  value?: string
  onChange: (date: string) => void
  onClose: () => void
  eventDates?: Set<string>
  location?: LocationInfo
}) {
  const todayIso = toLocalIsoDate(new Date())
  const initDate =
    value && value !== 'today' ? new Date(value + 'T00:00:00') : new Date()
  const [year, setYear] = useState(initDate.getFullYear())
  const [month, setMonth] = useState(initDate.getMonth())
  const [fetchedDates, setFetchedDates] = useState<Set<string>>(initialEventDates ?? new Set())

  const fetchMonthDates = useCallback(async (y: number, m: number) => {
    if (!location) return
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`
    const params = new URLSearchParams({ city: location.city, month: monthStr })
    if (location.lat !== undefined) params.set('lat', String(location.lat))
    if (location.lng !== undefined) params.set('lng', String(location.lng))
    if (location.radiusKm !== undefined) params.set('radius', String(location.radiusKm))
    try {
      const res = await fetch(`/api/events/dates?${params}`)
      if (!res.ok) return
      const dates: string[] = await res.json()
      setFetchedDates(new Set(dates))
    } catch { /* ignore */ }
  }, [location])

  useEffect(() => { fetchMonthDates(year, month) }, [year, month, fetchMonthDates])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Mon-first

  const monthLabel = new Date(year, month).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })

  const selectedIso = value === 'today' ? todayIso : value

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso === todayIso ? 'today' : iso)
    onClose()
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="absolute top-full right-0 mt-2 z-50 bg-card border border-border-md
      rounded-2xl shadow-2xl p-4 w-64 select-none">
      {/* month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted
            hover:text-text hover:bg-elev transition-colors text-base"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-text capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted
            hover:text-text hover:bg-elev transition-colors text-base"
        >
          ›
        </button>
      </div>

      {/* weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = iso === selectedIso
          const isToday = iso === todayIso
          const isPast = iso < todayIso
          return (
            <button
              key={i}
              onClick={() => selectDay(day)}
              disabled={isPast}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs
                font-medium transition-colors cursor-pointer gap-0.5
                ${isSelected
                  ? 'bg-accent text-bg font-bold'
                  : isToday
                  ? 'ring-1 ring-accent text-accent'
                  : isPast
                  ? 'text-muted/40 cursor-default'
                  : 'text-text hover:bg-elev2'
                }`}
            >
              {day}
              {fetchedDates.has(iso) && !isPast && (
                <span className={`w-1 h-1 rounded-full shrink-0 ${isSelected ? 'bg-bg' : 'bg-accent'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Props = {
  value?: string
  onChange: (date: string | undefined) => void
  className?: string
  eventDates?: Set<string>
  location?: LocationInfo
}

export default function DateTabs({ value, onChange, className, eventDates, location }: Props) {
  const pills = buildPills()
  const [showCalendar, setShowCalendar] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isCustomDate =
    value !== undefined &&
    value !== 'today' &&
    !pills.some((p) => p.value === value)

  // close calendar on outside click
  useEffect(() => {
    if (!showCalendar) return
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showCalendar])

  function formatCustomPill(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative flex items-stretch${className ? ` ${className}` : ''}`}
    >
      {/* scrollable pills */}
      <div className="flex-1 min-w-0 flex overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden">
        {pills.map((pill) => {
          const active = value === pill.value
          return (
            <button
              key={pill.value}
              onClick={() => onChange(active ? undefined : pill.value)}
              className={`shrink-0 flex flex-col items-center px-3.5 py-2 pb-2.5 border-b-2 -mb-px
                text-xs font-medium transition-colors
                ${active
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-bright'
                }`}
            >
              <span className="font-semibold lowercase">{pill.label}</span>
              {pill.sublabel && <span className="opacity-60 text-[10px]">{pill.sublabel}</span>}
            </button>
          )
        })}

        {isCustomDate && (
          <button
            onClick={() => onChange(undefined)}
            className="shrink-0 flex flex-col items-center px-3.5 py-2 pb-2.5 border-b-2 -mb-px
              border-accent text-accent text-xs font-medium"
          >
            <span className="font-semibold">{formatCustomPill(value!)}</span>
            <span className="opacity-60 text-[10px]">×</span>
          </button>
        )}
      </div>

      {/* calendar button — always visible, pinned right */}
      <div className="shrink-0 border-b border-border flex items-center relative">
        <button
          aria-label="calendario"
          onClick={() => setShowCalendar((s) => !s)}
          className={`flex items-center justify-center px-3 transition-colors
            ${showCalendar ? 'text-accent' : 'text-muted hover:text-bright'}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {showCalendar && (
          <CalendarPopover
            value={value}
            onChange={(date) => onChange(date)}
            onClose={() => setShowCalendar(false)}
            eventDates={eventDates}
            location={location}
          />
        )}
      </div>
    </div>
  )
}
