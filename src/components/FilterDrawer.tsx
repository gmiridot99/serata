'use client'

import { useEffect, useState } from 'react'
import type { EventType, Setting, TimeOfDay } from '@/lib/types'
import { EventTypeChips, SettingChips } from './VibeFilterChips'
import TimeOfDayChips from './TimeOfDayChips'

type Props = {
  open: boolean
  timeOfDay: TimeOfDay[]
  eventType: EventType[]
  setting: Setting | undefined
  onApply: (next: { timeOfDay: TimeOfDay[]; eventType: EventType[]; setting: Setting | undefined }) => void
  onClose: () => void
  previewCount?: (pending: { timeOfDay: TimeOfDay[]; eventType: EventType[]; setting: Setting | undefined }) => number
}

export default function FilterDrawer({
  open, timeOfDay, eventType, setting, onApply, onClose, previewCount,
}: Props) {
  const [localTimeOfDay, setLocalTimeOfDay] = useState<TimeOfDay[]>(timeOfDay)
  const [localTypes, setLocalTypes] = useState<EventType[]>(eventType)
  const [localSetting, setLocalSetting] = useState<Setting | undefined>(setting)

  useEffect(() => {
    if (open) {
      setLocalTimeOfDay(timeOfDay)
      setLocalTypes(eventType)
      setLocalSetting(setting)
    }
  }, [open, timeOfDay, eventType, setting])

  if (!open) return null

  function reset() {
    setLocalTimeOfDay([])
    setLocalTypes([])
    setLocalSetting(undefined)
  }

  function apply() {
    onApply({ timeOfDay: localTimeOfDay, eventType: localTypes, setting: localSetting })
  }

  const pendingCount = previewCount?.({
    timeOfDay: localTimeOfDay,
    eventType: localTypes,
    setting: localSetting,
  })

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full sm:w-80 sm:h-full max-h-[80vh] sm:max-h-none bg-bg border-t sm:border-t-0 sm:border-l border-border flex flex-col animate-slide-up-fast sm:animate-slide-right"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium">Filtri</h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-muted text-lg">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Quando</span>
              <button onClick={() => setLocalTimeOfDay([])} className="text-xs text-muted">reset</button>
            </div>
            <TimeOfDayChips value={localTimeOfDay} onChange={setLocalTimeOfDay} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Tipo serata</span>
              <button onClick={() => setLocalTypes([])} className="text-xs text-muted">reset</button>
            </div>
            <EventTypeChips value={localTypes} onChange={setLocalTypes} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Ambiente</span>
              <button onClick={() => setLocalSetting(undefined)} className="text-xs text-muted">reset</button>
            </div>
            <SettingChips value={localSetting} onChange={setLocalSetting} />
          </section>
        </div>

        <div className="border-t border-border px-4 py-3 flex gap-2">
          <button
            onClick={reset}
            className="flex-1 px-3 py-2 rounded-full border border-border text-sm"
          >
            Pulisci tutto
          </button>
          <button
            onClick={apply}
            className="flex-1 px-3 py-2 rounded-full bg-accent text-white text-sm font-medium"
          >
            {pendingCount !== undefined ? `Mostra ${pendingCount} risultati` : 'Applica'}
          </button>
        </div>
      </div>
    </div>
  )
}
