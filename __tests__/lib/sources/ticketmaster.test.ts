import { normalizeEvent } from '@/lib/sources/ticketmaster'

const RAW_EVENT = {
  id: 'Z698xZC2Z17',
  name: 'Marco Mengoni Live',
  dates: {
    start: { localDate: '2026-06-15', localTime: '21:00:00' },
    end: { localDate: '2026-06-15', localTime: '23:30:00' },
  },
  classifications: [
    { segment: { name: 'Music' }, genre: { name: 'Pop' } },
  ],
  priceRanges: [{ min: 35, max: 80, currency: 'EUR' }],
  images: [
    { url: 'https://s1.ticketm.net/small.jpg', width: 205, height: 115 },
    { url: 'https://s1.ticketm.net/large.jpg', width: 1024, height: 576 },
  ],
  url: 'https://www.ticketmaster.it/event/Z698xZC2Z17',
  _embedded: {
    venues: [
      {
        name: 'Mediolanum Forum',
        address: { line1: 'Via Giuseppe Di Vittorio 6' },
        city: { name: 'Assago' },
        location: { latitude: '45.4081', longitude: '9.1245' },
      },
    ],
  },
}

describe('normalizeEvent (Ticketmaster)', () => {
  it('prefixes id with tm_', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.id).toBe('tm_Z698xZC2Z17')
  })

  it('maps Music segment to concert', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.category).toBe('concert')
  })

  it('extracts startTime and endTime correctly', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.startTime).toBe('21:00')
    expect(event.endTime).toBe('23:30')
  })

  it('picks the largest image', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.imageUrl).toBe('https://s1.ticketm.net/large.jpg')
  })

  it('parses paid price correctly', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.price).toEqual({ min: 35, max: 80, currency: 'EUR' })
  })

  it('maps free event (no priceRanges) to "free"', () => {
    const event = normalizeEvent({ ...RAW_EVENT, priceRanges: undefined })
    expect(event.price).toBe('free')
  })

  it('maps free event (min=0) to "free"', () => {
    const event = normalizeEvent({
      ...RAW_EVENT,
      priceRanges: [{ min: 0, max: 0, currency: 'EUR' }],
    })
    expect(event.price).toBe('free')
  })

  it('parses venue coordinates', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.venue.lat).toBe(45.4081)
    expect(event.venue.lng).toBe(9.1245)
  })

  it('combines venue address from line1 and city', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.venue.address).toBe('Via Giuseppe Di Vittorio 6, Assago')
  })

  it('sets source to ticketmaster', () => {
    const event = normalizeEvent(RAW_EVENT)
    expect(event.source).toBe('ticketmaster')
  })

  it('maps Arts & Theatre segment to theatre', () => {
    const event = normalizeEvent({
      ...RAW_EVENT,
      classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Drama' } }],
    })
    expect(event.category).toBe('theatre')
  })

  it('maps Arts & Theatre + Classical genre to concert', () => {
    const event = normalizeEvent({
      ...RAW_EVENT,
      classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Classical' } }],
    })
    expect(event.category).toBe('concert')
  })
})
