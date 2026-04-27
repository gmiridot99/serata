'use client'

type Tab = 'events' | 'map' | 'venues'

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

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'events',  label: 'eventi', Icon: CalendarIcon },
  { id: 'map',     label: 'mappa',  Icon: MapIcon },
  { id: 'venues',  label: 'locali', Icon: HomeIcon },
]

type Props = {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

export default function BottomNav({ activeTab, onChange }: Props) {
  return (
    <nav className="md:hidden flex border-t border-border bg-bg pb-safe shrink-0">
      {TABS.map((tab) => {
        const active = activeTab === tab.id
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
