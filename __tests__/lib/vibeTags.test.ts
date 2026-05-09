import { deriveTimeOfDay, extractRuleTags } from '@/lib/vibeTags'
import type { Event } from '@/lib/types'

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'x', title: '', description: '', category: 'other',
    date: '2026-05-09T20:00:00', startTime: '20:00',
    venue: { name: '', address: '', lat: 0, lng: 0 },
    price: 'free', ticketUrl: '', source: 'tm',
    ...overrides,
  }
}

describe('deriveTimeOfDay', () => {
  it('returns afternoon for hours <18', () => {
    expect(deriveTimeOfDay('15:00')).toBe('afternoon')
    expect(deriveTimeOfDay('17:59')).toBe('afternoon')
  })

  it('returns aperitivo for hours 18 to 20:59', () => {
    expect(deriveTimeOfDay('18:00')).toBe('aperitivo')
    expect(deriveTimeOfDay('19:30')).toBe('aperitivo')
    expect(deriveTimeOfDay('20:59')).toBe('aperitivo')
  })

  it('returns dinner for hours 21 to 22:59', () => {
    expect(deriveTimeOfDay('21:00')).toBe('dinner')
    expect(deriveTimeOfDay('22:59')).toBe('dinner')
  })

  it('returns late for hours >=23 and early morning', () => {
    expect(deriveTimeOfDay('23:00')).toBe('late')
    expect(deriveTimeOfDay('01:30')).toBe('late')
    expect(deriveTimeOfDay('05:00')).toBe('late')
  })

  it('handles malformed input as afternoon', () => {
    expect(deriveTimeOfDay('')).toBe('afternoon')
    expect(deriveTimeOfDay('xx:yy')).toBe('afternoon')
  })
})

describe('extractRuleTags', () => {
  it('returns dj when DICE source has music:dj tag', () => {
    const e = makeEvent({ source: 'dice', sourceTags: ['music:dj'] })
    expect(extractRuleTags(e)).toEqual({ eventType: ['dj'] })
  })

  it('returns live when DICE has music:gig tag', () => {
    const e = makeEvent({ source: 'dice', sourceTags: ['music:gig'] })
    expect(extractRuleTags(e)).toEqual({ eventType: ['live'] })
  })

  it('returns dj when TM sourceTags include subgenre with DJ', () => {
    const e = makeEvent({ source: 'ticketmaster', sourceTags: ['Music', 'DJ/Dance'] })
    expect(extractRuleTags(e)).toEqual({ eventType: ['dj'] })
  })

  it('returns live for TM Music segment without DJ subgenre', () => {
    const e = makeEvent({ source: 'ticketmaster', sourceTags: ['Music', 'Pop'] })
    expect(extractRuleTags(e)).toEqual({ eventType: ['live'] })
  })

  it('returns dj for any RA event', () => {
    const e = makeEvent({ source: 'ra' })
    expect(extractRuleTags(e)).toEqual({ eventType: ['dj'] })
  })

  it('adds festival when title contains festival', () => {
    const e = makeEvent({ source: 'dice', sourceTags: ['music:gig'], title: 'Summer Music Festival' })
    expect(extractRuleTags(e).eventType).toEqual(expect.arrayContaining(['live', 'festival']))
  })

  it('returns silent-disco when title matches', () => {
    const e = makeEvent({ source: 'eventbrite', title: 'Silent Disco Night' })
    expect(extractRuleTags(e)).toEqual({ eventType: ['silent-disco'] })
  })

  it('returns open-mic for "open mic" title', () => {
    const e = makeEvent({ source: 'eventbrite', title: 'Tuesday Open Mic' })
    expect(extractRuleTags(e)).toEqual({ eventType: ['open-mic'] })
  })

  it('returns open-mic for "jam session" title', () => {
    const e = makeEvent({ source: 'eventbrite', title: 'Friday Jam Session' })
    expect(extractRuleTags(e)).toEqual({ eventType: ['open-mic'] })
  })

  it('returns empty for unmatched event', () => {
    const e = makeEvent({ source: 'eventbrite', title: 'Random talk' })
    expect(extractRuleTags(e)).toEqual({})
  })

  it('never sets setting (always undefined)', () => {
    const e = makeEvent({ source: 'dice', sourceTags: ['music:dj'] })
    expect(extractRuleTags(e).setting).toBeUndefined()
  })
})
