type Props = {
  mode: 'events' | 'venues'
  onChange: (mode: 'events' | 'venues') => void
  className?: string
}

export default function ModeToggle({ mode, onChange, className }: Props) {
  return (
    <div className={`flex bg-elev rounded-full p-0.5 gap-0.5${className ? ` ${className}` : ''}`}>
      <button
        onClick={() => onChange('events')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          mode === 'events' ? 'bg-accent text-bg' : 'text-muted hover:text-text'
        }`}
      >
        eventi
      </button>
      <button
        onClick={() => onChange('venues')}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          mode === 'venues' ? 'bg-accent text-bg' : 'text-muted hover:text-text'
        }`}
      >
        locali
      </button>
    </div>
  )
}
