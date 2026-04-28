type Props = {
  location: { name: string } | null
  onClick: () => void
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function LocationChip({ location, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
        border border-border-md bg-transparent text-sm font-medium
        text-text hover:border-border transition-colors"
    >
      <PinIcon className="w-3.5 h-3.5 text-accent shrink-0" />
      <span>{location?.name ?? 'Scegli città'}</span>
      <ChevronIcon className="w-3 h-3 text-muted" />
    </button>
  )
}
