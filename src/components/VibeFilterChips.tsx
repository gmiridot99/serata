'use client'

import type { EventType, Setting } from '@/lib/types'

const TYPES: { key: EventType; label: string; emoji: string }[] = [
  { key: 'live',         label: 'Live',         emoji: '🎤' },
  { key: 'dj',           label: 'DJ',           emoji: '🎧' },
  { key: 'festival',     label: 'Festival',     emoji: '🎪' },
  { key: 'open-mic',     label: 'Open mic',     emoji: '🎙' },
  { key: 'silent-disco', label: 'Silent disco', emoji: '🤫' },
]

const SETTINGS: { key: Setting | 'any'; label: string; emoji: string }[] = [
  { key: 'any',     label: 'Qualsiasi', emoji: '·' },
  { key: 'indoor',  label: 'Indoor',    emoji: '🏠' },
  { key: 'outdoor', label: 'Outdoor',   emoji: '🌳' },
]

type EventTypeProps = {
  value: EventType[]
  onChange: (v: EventType[]) => void
}

export function EventTypeChips({ value, onChange }: EventTypeProps) {
  function toggle(k: EventType) {
    onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map(t => {
        const active = value.includes(t.key)
        return (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{t.emoji}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

type SettingProps = {
  value: Setting | undefined
  onChange: (v: Setting | undefined) => void
}

export function SettingChips({ value, onChange }: SettingProps) {
  function pick(k: Setting | 'any') {
    onChange(k === 'any' ? undefined : k)
  }
  return (
    <div className="flex gap-2">
      {SETTINGS.map(s => {
        const active = (s.key === 'any' && value === undefined) || s.key === value
        return (
          <button
            key={s.key}
            onClick={() => pick(s.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
