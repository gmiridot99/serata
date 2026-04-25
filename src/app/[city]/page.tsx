import Link from 'next/link'
import { fetchEvents } from '@/lib/sources'
import { EventCategory, EventQuery } from '@/lib/types'
import CityPageClient from '@/components/CityPageClient'

const VALID_CATEGORIES = new Set<EventCategory>([
  'club',
  'concert',
  'aperitivo',
  'theatre',
  'other',
])

function isValidCategory(value: string): value is EventCategory {
  return VALID_CATEGORIES.has(value as EventCategory)
}

type Props = {
  params: Promise<{ city: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city } = await params
  const decodedCity = decodeURIComponent(city)
  const sp = await searchParams

  const dateParam = typeof sp.date === 'string' ? sp.date : undefined
  const date =
    dateParam === 'today' || dateParam === 'weekend' ? dateParam : undefined

  const categoryParam = typeof sp.category === 'string' ? sp.category : undefined
  const categories: EventCategory[] = categoryParam
    ? categoryParam.split(',').filter(isValidCategory)
    : []

  const free = sp.free === 'true'

  const query: EventQuery = {
    city: decodedCity,
    date,
    category: categories.length > 0 ? categories : undefined,
    free,
  }

  const initialFilters: { date?: 'today' | 'weekend'; categories: EventCategory[]; free: boolean } = {
    date,
    categories,
    free,
  }

  const events = await fetchEvents(query)

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          ← Home
        </Link>
        <h1 className="text-2xl font-bold text-text mt-2 capitalize">
          {decodedCity}
        </h1>
      </header>

      <CityPageClient
        events={events}
        city={decodedCity}
        initialFilters={initialFilters}
      />
    </div>
  )
}
