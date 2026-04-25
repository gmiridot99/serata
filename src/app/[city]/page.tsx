import Link from 'next/link'
import { fetchEvents } from '@/lib/sources'
import { EventQuery } from '@/lib/types'
import CityPageClient from '@/components/CityPageClient'

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

  const free = sp.free === 'true'

  const q = typeof sp.q === 'string' && sp.q.trim() ? sp.q.trim() : undefined

  const query: EventQuery = { city: decodedCity, date, free }
  if (q) query.q = q

  const initialFilters: { date?: 'today' | 'weekend'; free: boolean; q?: string } = {
    date,
    free,
    q,
  }

  const events = await fetchEvents(query)

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-4 pt-6 pb-4 max-w-5xl mx-auto">
        <Link href="/" className="text-text-muted text-sm hover:text-text transition-colors">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold text-text mt-2 capitalize">{decodedCity}</h1>
      </header>

      <CityPageClient
        events={events}
        city={decodedCity}
        initialFilters={initialFilters}
      />
    </div>
  )
}
