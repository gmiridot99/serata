'use client'

import { useEffect, useState } from 'react'
import type { EventType, Setting } from '@/lib/types'
import { EventTypeChips, SettingChips } from './VibeFilterChips'

type Props = {
  open: boolean
  eventType: EventType[]
  setting: Setting | undefined
  previewCount: number
  onApply: (next: { eventType: EventType[]; setting: Setting | undefined }) => void
  onClose: () => void
}

export default function FilterDrawer({
  open, eventType, setting, previewCount, onApply, onClose,
}: Props) {
  const [localTypes, setLocalTypes] = useState<EventType[]>(eventType)
  const [localSetting, setLocalSetting] = useState<Setting | undefined>(setting)

  useEffect(() => {
    if (open) {
      setLocalTypes(eventType)
      setLocalSetting(setting)
    }
  }, [open, eventType, setting])

  if (!open) return null

  function reset() {
    setLocalTypes([])
    setLocalSetting(undefined)
  }

  function apply() {
    onApply({ eventType: localTypes, setting: localSetting })
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full sm:w-80 sm:h-full max-h-[70vh] sm:max-h-none bg-bg border-t sm:border-t-0 sm:border-l border-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium">Filtri avanzati</h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-muted text-lg">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
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
            Applica ({previewCount})
          </button>
        </div>
      </div>
    </div>
  )
}
