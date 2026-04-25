import { fetchEvents } from '@/lib/sources'
import EventGrid from '@/components/EventGrid'
import CitySearchWrapper from '@/components/CitySearchWrapper'

const FEATURED_CITIES = ['Milano', 'Roma', 'Napoli']

export default async function Home() {
  const results = await Promise.allSettled(
    FEATURED_CITIES.map((city) => fetchEvents({ city, date: 'today' }))
  )

  const featuredEvents = results
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchEvents>>> =>
        r.status === 'fulfilled'
    )
    .flatMap((r) => r.value)
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="flex flex-col items-center pt-16 pb-10 px-4">
        <h1 className="text-2xl font-bold text-accent">Serata</h1>
        <p className="text-text-muted mt-2 text-base">
          Scopri eventi e serate nella tua città
        </p>
      </header>

      {/* City Search */}
      <section className="max-w-lg mx-auto px-4">
        <CitySearchWrapper />
      </section>

      {/* Featured Events */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-text mb-6">In evidenza</h2>
        {featuredEvents.length > 0 ? (
          <EventGrid events={featuredEvents} />
        ) : (
          <p className="text-text-muted text-center py-12">
            Nessun evento in evidenza al momento.
          </p>
        )}
      </section>
    </div>
  )
}
