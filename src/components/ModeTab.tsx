// src/components/ModeTab.tsx
type Props = {
  mode: 'events' | 'venues'
  onChange: (mode: 'events' | 'venues') => void
}

export default function ModeTab({ mode, onChange }: Props) {
  return (
    <div className="flex bg-bg-card rounded-xl p-0.5 gap-0.5">
      <button
        onClick={() => onChange('events')}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
          mode === 'events'
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text'
        }`}
      >
        🎉 Eventi
      </button>
      <button
        onClick={() => onChange('venues')}
        className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
          mode === 'venues'
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text'
        }`}
      >
        🍸 Locali
      </button>
    </div>
  )
}
