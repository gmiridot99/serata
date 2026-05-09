import { createMapTagCache } from '@/lib/tagCache'
import type { VibeTags } from '@/lib/types'

describe('MapTagCache', () => {
  it('returns undefined for unknown id', () => {
    const c = createMapTagCache()
    expect(c.get('a')).toBeUndefined()
  })

  it('stores and retrieves tags', () => {
    const c = createMapTagCache()
    const tags: VibeTags = { eventType: ['dj'] }
    c.set('a', tags)
    expect(c.get('a')).toEqual(tags)
  })

  it('getMany returns Map of present entries only', () => {
    const c = createMapTagCache()
    c.set('a', { eventType: ['live'] })
    c.set('b', { setting: 'outdoor' })
    const result = c.getMany(['a', 'b', 'c'])
    expect(result.size).toBe(2)
    expect(result.get('a')).toEqual({ eventType: ['live'] })
    expect(result.get('b')).toEqual({ setting: 'outdoor' })
    expect(result.has('c')).toBe(false)
  })

  it('setMany merges multiple entries', () => {
    const c = createMapTagCache()
    const entries = new Map<string, VibeTags>([
      ['a', { eventType: ['dj'] }],
      ['b', { setting: 'indoor' }],
    ])
    c.setMany(entries)
    expect(c.get('a')).toEqual({ eventType: ['dj'] })
    expect(c.get('b')).toEqual({ setting: 'indoor' })
  })

  it('set merges into existing tags rather than overwriting', () => {
    const c = createMapTagCache()
    c.set('a', { eventType: ['dj'] })
    c.set('a', { setting: 'outdoor' })
    expect(c.get('a')).toEqual({ eventType: ['dj'], setting: 'outdoor' })
  })
})
