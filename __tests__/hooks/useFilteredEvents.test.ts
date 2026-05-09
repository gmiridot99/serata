import { renderHook, waitFor, act } from '@testing-library/react'
import type { Event } from '@/lib/types'

const enrichTagsMock = jest.fn()

jest.mock('@/lib/enrichTags', () => ({
  enrichTags: (events: Event[]) => enrichTagsMock(events),
}))

import { useFilteredEvents } from '@/hooks/useFilteredEvents'
import { tagCache } from '@/lib/tagCache'

function makeEvent(id: string, over: Partial<Event> = {}): Event {
  return {
    id, title: '', description: '', category: 'other',
    date: '2026-05-09T20:00:00', startTime: '20:00',
    venue: { name: '', address: '', lat: 0, lng: 0 },
    price: 'free', ticketUrl: '', source: 'tm',
    ...over,
  }
}

describe('useFilteredEvents', () => {
  beforeEach(() => {
    enrichTagsMock.mockReset()
    tagCache.clear()
    for (const k of ['a', 'b', 'c']) tagCache.set(k, {})
  })

  it('returns all events with no filters, no enrichment', async () => {
    const events = [makeEvent('a'), makeEvent('b')]
    const { result } = renderHook(() => useFilteredEvents(events, {}))
    expect(result.current.events).toHaveLength(2)
    expect(result.current.enriching).toBe(false)
    expect(enrichTagsMock).not.toHaveBeenCalled()
  })

  it('does not enrich when only timeOfDay filter active', () => {
    const events = [makeEvent('a', { startTime: '19:00' })]
    renderHook(() => useFilteredEvents(events, { timeOfDay: ['aperitivo'] }))
    expect(enrichTagsMock).not.toHaveBeenCalled()
  })

  it('triggers enrichment when setting filter active and cache miss', async () => {
    enrichTagsMock.mockResolvedValueOnce(new Map([['a', { setting: 'outdoor' }]]))
    const events = [makeEvent('a')]
    const { result } = renderHook(() =>
      useFilteredEvents(events, { setting: 'outdoor' }),
    )
    await waitFor(() => expect(enrichTagsMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.enriching).toBe(false))
    expect(result.current.events.map(e => e.id)).toEqual(['a'])
  })

  it('hits cache on second activation (no second call)', async () => {
    enrichTagsMock.mockResolvedValueOnce(new Map([['a', { setting: 'outdoor' }]]))
    const events = [makeEvent('a')]
    const { rerender } = renderHook(
      ({ filters }: { filters: Parameters<typeof useFilteredEvents>[1] }) =>
        useFilteredEvents(events, filters),
      { initialProps: { filters: { setting: 'outdoor' as const } } as { filters: Parameters<typeof useFilteredEvents>[1] } },
    )
    await waitFor(() => expect(enrichTagsMock).toHaveBeenCalledTimes(1))
    rerender({ filters: {} })
    rerender({ filters: { setting: 'outdoor' } })
    await act(async () => {})
    expect(enrichTagsMock).toHaveBeenCalledTimes(1)
  })
})
