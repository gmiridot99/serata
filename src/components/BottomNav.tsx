'use client'

type Mode = 'events' | 'venues'

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

const TABS: { id: Mode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'events', label: 'eventi', Icon: CalendarIcon },
  { id: 'venues', label: 'locali', Icon: CompassIcon },
]

type Props = {
  activeMode: Mode
  onChange: (mode: Mode) => void
}

export default function BottomNav({ activeMode, onChange }: Props) {
  return (
    <nav className="md:hidden flex border-t border-border bg-bg shrink-0 pb-safe pt-2">
      {TABS.map((tab) => {
        const active = activeMode === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors
              ${active ? 'text-accent' : 'text-muted'}`}
          >
            <tab.Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
