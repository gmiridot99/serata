import { renderHook, waitFor, act } from '@testing-library/react'
import type { Event } from '@/lib/types'

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

function mockFetchOnce(tags: Array<{ id: string; [k: string]: unknown }>) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tags }),
  })
}

describe('useFilteredEvents', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    tagCache.clear()
    for (const k of ['a', 'b', 'c']) tagCache.set(k, {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns all events with no filters, no enrichment', async () => {
    const events = [makeEvent('a'), makeEvent('b')]
    const { result } = renderHook(() => useFilteredEvents(events, {}))
    expect(result.current.events).toHaveLength(2)
    expect(result.current.enriching).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not enrich when only timeOfDay filter active', () => {
    const events = [makeEvent('a', { startTime: '19:00' })]
    renderHook(() => useFilteredEvents(events, { timeOfDay: ['aperitivo'] }))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('triggers enrichment when setting filter active and cache miss', async () => {
    mockFetchOnce([{ id: 'a', setting: 'outdoor' }])
    const events = [makeEvent('a')]
    const { result } = renderHook(() =>
      useFilteredEvents(events, { setting: 'outdoor' }),
    )
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.enriching).toBe(false))
    expect(result.current.events.map(e => e.id)).toEqual(['a'])
  })

  it('hits cache on second activation (no second call)', async () => {
    mockFetchOnce([{ id: 'a', setting: 'outdoor' }])
    const events = [makeEvent('a')]
    const { rerender } = renderHook(
      ({ filters }: { filters: Parameters<typeof useFilteredEvents>[1] }) =>
        useFilteredEvents(events, filters),
      { initialProps: { filters: { setting: 'outdoor' as const } } as { filters: Parameters<typeof useFilteredEvents>[1] } },
    )
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    rerender({ filters: {} })
    rerender({ filters: { setting: 'outdoor' } })
    await act(async () => {})
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
