'use client'

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

type Props = {
  onClick: () => void
  isOpen?: boolean
}

export default function MapFAB({ onClick, isOpen }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Chiudi mappa' : 'Apri mappa'}
      className="fixed right-6 z-40 flex items-center gap-2 bg-accent text-inv rounded-full px-5 py-3 font-semibold text-sm transition-all duration-200 active:scale-95 md:bottom-6 bottom-20"
      style={{
        boxShadow: '0 12px 32px -10px rgba(240,160,32,0.5), 0 6px 18px rgba(0,0,0,0.4)',
      }}
    >
      <MapIcon />
      {isOpen ? 'chiudi mappa' : 'apri mappa'}
    </button>
  )
}
