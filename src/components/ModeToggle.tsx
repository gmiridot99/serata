'use client'

type Mode = 'events' | 'venues'

type Props = {
  mode: Mode
  onChange: (mode: Mode) => void
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="hidden md:flex items-center bg-elev rounded-full p-0.5 gap-0.5 shrink-0">
      {(['events', 'venues'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            mode === m
              ? 'bg-accent text-inv'
              : 'text-muted hover:text-text'
          }`}
        >
          {m === 'events' ? 'eventi' : 'locali'}
        </button>
      ))}
    </div>
  )
}
