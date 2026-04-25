import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchEventById } from '@/lib/sources'
import { Event, EventPrice } from '@/lib/types'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ city: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, id } = await params
  void city
  const event = await fetchEventById(id)
  if (!event) return {}
  return {
    title: `${event.title} — Serata`,
    description: event.description.slice(0, 150),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 150),
      images: event.imageUrl ? [event.imageUrl] : [],
    },
  }
}

function formatPrice(price: EventPrice): string {
  if (price === 'free') return 'Gratuito'
  return `${price.min}–${price.max} ${price.currency}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function EventDetailPage({ params }: Props) {
  const { city, id } = await params
  const decodedCity = decodeURIComponent(city)

  const event: Event | null = await fetchEventById(id)
  if (!event) notFound()

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-card to-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
        <div className="absolute bottom-4 left-4">
          <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            {event.category}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          href={`/${encodeURIComponent(decodedCity)}`}
          className="text-text-muted text-sm hover:text-text transition-colors"
        >
          ← {decodedCity}
        </Link>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text mt-4">{event.title}</h1>

        {/* Info box */}
        <div className="bg-bg-card rounded-xl p-6 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <span>📅</span>
            <span className="text-text text-sm">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>🕐</span>
            <span className="text-text text-sm">
              {event.startTime}
              {event.endTime ? ` – ${event.endTime}` : ''}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span>📍</span>
            <span className="text-text text-sm">
              {event.venue.name}, {event.venue.address}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span>💰</span>
            <span className="text-text text-sm">{formatPrice(event.price)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-muted mt-6 leading-relaxed">{event.description}</p>

        {/* Venue placeholder (mini-map) */}
        <div className="bg-bg-card rounded-xl p-4 mt-6 flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-text font-medium">{event.venue.name}</p>
            <p className="text-text-muted text-sm">{event.venue.address}</p>
          </div>
        </div>

        {/* CTA */}
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block w-full bg-accent text-white text-center py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Compra biglietti su Eventbrite →
        </a>
      </div>
    </div>
  )
}
