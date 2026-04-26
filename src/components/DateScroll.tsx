'use client'

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Pill = { label: string; sublabel: string; value: string }

function buildPills(): Pill[] {
  const now = new Date()
  const pills: Pill[] = []

  pills.push({
    label: 'Stasera',
    sublabel: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    value: 'today',
  })

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    pills.push({
      label: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      sublabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      value: toLocalIsoDate(d),
    })
  }

  return pills
}

type Props = {
  value?: string
  onChange: (date: string | undefined) => void
}

export default function DateScroll({ value, onChange }: Props) {
  const pills = buildPills()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {pills.map((pill) => {
        const active = value === pill.value
        return (
          <button
            key={pill.value}
            onClick={() => onChange(active ? undefined : pill.value)}
            className={`shrink-0 flex flex-col items-center px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-muted border border-white/10 hover:border-white/30'
            }`}
          >
            <span className="font-semibold">{pill.label}</span>
            <span className="opacity-70">{pill.sublabel}</span>
          </button>
        )
      })}
    </div>
  )
}
