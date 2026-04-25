import { normalizeEvent } from '@/lib/sources/eventbrite'

const RAW_EVENT = {
  id: '123',
  name: { text: 'Notte Latina' },
  description: { text: 'Una serata di ritmi latini.' },
  start: { utc: '2026-04-25T21:00:00Z', local: '2026-04-25T23:00:00' },
  end: { utc: '2026-04-26T02:00:00Z', local: '2026-04-26T04:00:00' },
  is_free: false,
  ticket_availability: {
    minimum_ticket_price: { value: 15, currency: 'EUR' },
  },
  logo: { url: 'https://example.com/img.jpg' },
  url: 'https://eventbrite.com/e/123',
  category_id: '113',
  venue: {
    name: 'Fabric Milano',
    address: { localized_address_display: 'Via Fabio Filzi 34, Milano' },
    latitude: '45.4654',
    longitude: '9.1859',
  },
}

describe('normalizeEvent', () => {
  it('maps category_id 113 to club', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.category).toBe('club')
  })

  it('extracts startTime from local datetime', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.startTime).toBe('23:00')
  })

  it('parses price correctly', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.price).toEqual({ min: 15, max: 15, currency: 'EUR' })
  })

  it('maps free event to "free"', () => {
    const event = normalizeEvent({ ...RAW_EVENT, is_free: true })
    expect(event.price).toBe('free')
  })

  it('parses venue coordinates', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.venue.lat).toBe(45.4654)
    expect(event.venue.lng).toBe(9.1859)
  })

  it('falls back to "other" for unknown category', () => {
    const event = normalizeEvent({ ...RAW_EVENT, category_id: '999' })
    expect(event.category).toBe('other')
  })
})
