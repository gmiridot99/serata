import { filterEvents } from '@/lib/filterEvents'
import { createMapTagCache } from '@/lib/tagCache'
import type { Event } from '@/lib/types'

function makeEvent(over: Partial<Event>): Event {
  return {
    id: 'x',
    title: '',
    description: '',
    category: 'other',
    date: '2026-05-09T20:00:00',
    startTime: '20:00',
    venue: { name: '', address: '', lat: 0, lng: 0 },
    price: 'free',
    ticketUrl: '',
    source: 'tm',
    ...over,
  }
}

describe('filterEvents', () => {
  const empty = createMapTagCache()

  it('returns all events when no vibe filters set', () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })]
    expect(filterEvents(events, {}, empty)).toHaveLength(2)
  })

  it('filters by timeOfDay aperitivo', () => {
    const events = [
      makeEvent({ id: 'a', startTime: '15:00' }),
      makeEvent({ id: 'b', startTime: '19:00' }),
      makeEvent({ id: 'c', startTime: '23:30' }),
    ]
    const result = filterEvents(events, { timeOfDay: ['aperitivo'] }, empty)
    expect(result.map(e => e.id)).toEqual(['b'])
  })

  it('multi-select timeOfDay is OR', () => {
    const events = [
      makeEvent({ id: 'a', startTime: '15:00' }),
      makeEvent({ id: 'b', startTime: '19:00' }),
      makeEvent({ id: 'c', startTime: '23:30' }),
    ]
    const result = filterEvents(events, { timeOfDay: ['afternoon', 'late'] }, empty)
    expect(result.map(e => e.id)).toEqual(['a', 'c'])
  })

  it('filters by eventType using rule tags', () => {
    const events = [
      makeEvent({ id: 'a', source: 'dice', sourceTags: ['music:dj'] }),
      makeEvent({ id: 'b', source: 'dice', sourceTags: ['music:gig'] }),
    ]
    const result = filterEvents(events, { eventType: ['dj'] }, empty)
    expect(result.map(e => e.id)).toEqual(['a'])
  })

  it('eventType filter prefers cache over rule tags', () => {
    const cache = createMapTagCache()
    const events = [makeEvent({ id: 'a', source: 'eventbrite', title: 'Generic' })]
    cache.set('a', { eventType: ['festival'] })
    const result = filterEvents(events, { eventType: ['festival'] }, cache)
    expect(result.map(e => e.id)).toEqual(['a'])
  })

  it('drops events without setting tag when setting filter active', () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })]
    const cache = createMapTagCache()
    cache.set('a', { setting: 'outdoor' })
    const result = filterEvents(events, { setting: 'outdoor' }, cache)
    expect(result.map(e => e.id)).toEqual(['a'])
  })

  it('combines multiple filters with AND', () => {
    const cache = createMapTagCache()
    cache.set('a', { setting: 'outdoor', eventType: ['dj'] })
    cache.set('b', { setting: 'indoor', eventType: ['dj'] })
    const events = [
      makeEvent({ id: 'a', startTime: '23:00', source: 'dice', sourceTags: ['music:dj'] }),
      makeEvent({ id: 'b', startTime: '23:00', source: 'dice', sourceTags: ['music:dj'] }),
    ]
    const result = filterEvents(
      events,
      {
        timeOfDay: ['late'],
        eventType: ['dj'],
        setting: 'outdoor',
      },
      cache
    )
    expect(result.map(e => e.id)).toEqual(['a'])
  })
})
