'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Event } from '@/lib/types'
import { tagCache } from '@/lib/tagCache'
import { enrichTags } from '@/lib/enrichTags'
import { filterEvents, type VibeFilterInput } from '@/lib/filterEvents'

export interface UseFilteredEventsResult {
  events: Event[]
  enriching: boolean
}

const DEBOUNCE_MS = 300

export function useFilteredEvents(
  source: Event[],
  filters: VibeFilterInput,
): UseFilteredEventsResult {
  const [enriching, setEnriching] = useState(false)
  const [tick, setTick] = useState(0)
  const inflight = useRef<Set<string>>(new Set())

  const needsLLM =
    (filters.eventType && filters.eventType.length > 0) ||
    Boolean(filters.setting)

  useEffect(() => {
    if (!needsLLM || source.length === 0) return

    const missing = source.filter(e => {
      const cached = tagCache.get(e.id)
      const needSetting = Boolean(filters.setting) && !cached?.setting
      const needType =
        Boolean(filters.eventType?.length) &&
        !(cached?.eventType && cached.eventType.length > 0)
      return (needSetting || needType) && !inflight.current.has(e.id)
    })

    if (missing.length === 0) return

    const ids = missing.map(e => e.id)
    for (const id of ids) inflight.current.add(id)

    const handle = setTimeout(async () => {
      setEnriching(true)
      try {
        const tags = await enrichTags(missing)
        tagCache.setMany(tags)
      } finally {
        for (const id of ids) inflight.current.delete(id)
        setEnriching(false)
        setTick(t => t + 1)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [source, filters.eventType, filters.setting, needsLLM])

  const events = useMemo(
    () => filterEvents(source, filters, tagCache),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, filters.timeOfDay, filters.eventType, filters.setting, tick],
  )

  return { events, enriching }
}
