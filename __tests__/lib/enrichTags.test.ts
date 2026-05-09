import type { Event } from '@/lib/types'

const generateObjectMock = jest.fn()

jest.mock('ai', () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}))

jest.mock('@ai-sdk/deepseek', () => ({
  deepseek: () => ({ modelId: 'deepseek-chat' }),
}))

function makeEvent(id: string, over: Partial<Event> = {}): Event {
  return {
    id, title: `Title ${id}`, description: 'desc', category: 'other',
    date: '2026-05-09T20:00:00', startTime: '20:00',
    venue: { name: 'Venue', address: '', lat: 0, lng: 0 },
    price: 'free', ticketUrl: '', source: 'tm',
    ...over,
  }
}

describe('enrichTags', () => {
  beforeEach(() => {
    generateObjectMock.mockReset()
    process.env.DEEPSEEK_API_KEY = 'test-key'
    jest.resetModules()
  })

  it('returns empty Map when no events', async () => {
    const { enrichTags } = await import('@/lib/enrichTags')
    const result = await enrichTags([])
    expect(result.size).toBe(0)
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('calls generateObject with event payload', async () => {
    const { enrichTags } = await import('@/lib/enrichTags')
    generateObjectMock.mockResolvedValueOnce({
      object: { tags: [{ id: 'a', eventType: ['dj'], setting: 'outdoor' }] },
    })
    const result = await enrichTags([makeEvent('a')])
    expect(generateObjectMock).toHaveBeenCalledTimes(1)
    expect(result.get('a')).toEqual({ eventType: ['dj'], setting: 'outdoor' })
  })

  it('splits batches >50 into multiple calls', async () => {
    const { enrichTags } = await import('@/lib/enrichTags')
    generateObjectMock.mockResolvedValue({ object: { tags: [] } })
    const events = Array.from({ length: 75 }, (_, i) => makeEvent(`e${i}`))
    await enrichTags(events)
    expect(generateObjectMock).toHaveBeenCalledTimes(2)
  })

  it('returns empty Map when API key missing', async () => {
    delete process.env.DEEPSEEK_API_KEY
    const { enrichTags } = await import('@/lib/enrichTags')
    const result = await enrichTags([makeEvent('a')])
    expect(result.size).toBe(0)
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('returns empty Map on LLM error', async () => {
    const { enrichTags } = await import('@/lib/enrichTags')
    generateObjectMock.mockRejectedValueOnce(new Error('boom'))
    const result = await enrichTags([makeEvent('a')])
    expect(result.size).toBe(0)
  })

  it('skips entries with no eventType and no setting', async () => {
    const { enrichTags } = await import('@/lib/enrichTags')
    generateObjectMock.mockResolvedValueOnce({
      object: { tags: [{ id: 'a' }] },
    })
    const result = await enrichTags([makeEvent('a')])
    expect(result.size).toBe(0)
  })
})
