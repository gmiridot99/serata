// src/components/EmptyState.tsx
type Props = {
  onCitySelect: (city: string) => void
}

export default function EmptyState({ onCitySelect: _onCitySelect }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-5xl">🌆</span>
      <h2 className="text-xl font-semibold text-text">Dove sei stasera?</h2>
      <p className="text-text-muted text-sm max-w-xs">
        Cerca una città nella barra in alto per scoprire eventi, locali e serate
        nella tua zona.
      </p>
    </div>
  )
}
