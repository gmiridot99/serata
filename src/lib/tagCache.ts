import type { VibeTags } from '@/lib/types'

export interface TagCache {
  get(eventId: string): VibeTags | undefined
  getMany(eventIds: string[]): Map<string, VibeTags>
  set(eventId: string, tags: VibeTags): void
  setMany(entries: Map<string, VibeTags>): void
  clear(): void
}

export function createMapTagCache(): TagCache {
  const store = new Map<string, VibeTags>()

  return {
    get(eventId) {
      return store.get(eventId)
    },
    getMany(eventIds) {
      const result = new Map<string, VibeTags>()
      for (const id of eventIds) {
        const v = store.get(id)
        if (v !== undefined) result.set(id, v)
      }
      return result
    },
    set(eventId, tags) {
      const prev = store.get(eventId) ?? {}
      store.set(eventId, { ...prev, ...tags })
    },
    setMany(entries) {
      for (const [id, tags] of entries) {
        const prev = store.get(id) ?? {}
        store.set(id, { ...prev, ...tags })
      }
    },
    clear() {
      store.clear()
    },
  }
}

// Module-level singleton used by the app
export const tagCache: TagCache = createMapTagCache()
