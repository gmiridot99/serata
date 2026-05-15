import type { EventCategory } from './types'

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  club:      '#8b5cf6',
  concert:   '#3b82f6',
  aperitivo: '#f97316',
  theatre:   '#10b981',
  other:     '#6b7280',
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  club:      'club',
  concert:   'concerto',
  aperitivo: 'aperitivo',
  theatre:   'teatro',
  other:     'altro',
}
