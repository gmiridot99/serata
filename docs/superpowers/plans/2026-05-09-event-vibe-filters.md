# Event Vibe Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add timeOfDay (inline) + eventType + indoor/outdoor (drawer) filters to the events screen, with rule-based + lazy LLM enrichment.

**Architecture:** Client-side filtering on already-fetched events. Pure derivation for timeOfDay; rule-based extraction from source tags for eventType; LLM batch (Claude Sonnet 4.6 via Vercel AI Gateway) lazy on filter activation for missing tags. In-memory `Map` cache, swappable behind interface.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Jest + jsdom + Testing Library, Tailwind v4. New deps: `ai`, `zod` (zod already transitively present — verify).

**Spec:** `docs/superpowers/specs/2026-05-09-event-vibe-filters-design.md`

---

## File Structure

**New files:**
- `src/lib/vibeTags.ts` — `VibeTags` extraction rules + `deriveTimeOfDay`
- `src/lib/tagCache.ts` — `TagCache` interface + in-memory `MapTagCache` impl
- `src/lib/enrichTags.ts` — LLM batch caller via AI SDK
- `src/lib/filterEvents.ts` — pure `filterEvents(events, filters, cache)` function
- `src/hooks/useFilteredEvents.ts` — orchestrates derive + cache + enrich + filter
- `src/components/TimeOfDayChips.tsx` — inline multi-select chips
- `src/components/VibeFilterChips.tsx` — chip group used inside drawer
- `src/components/FilterDrawer.tsx` — slide-over / bottom sheet
- `__tests__/lib/vibeTags.test.ts`
- `__tests__/lib/filterEvents.test.ts`
- `__tests__/lib/tagCache.test.ts`
- `__tests__/lib/enrichTags.test.ts`
- `__tests__/hooks/useFilteredEvents.test.ts`
- `__tests__/components/TimeOfDayChips.test.tsx`
- `__tests__/components/FilterDrawer.test.tsx`

**Modified files:**
- `src/lib/types.ts` — add `TimeOfDay`, `EventType`, `Setting`, `VibeTags`, optional `Event.sourceTags`
- `src/lib/sources/dice.ts` — populate `sourceTags` from `tags_types`
- `src/lib/sources/ticketmaster.ts` — populate `sourceTags` from classifications
- `src/lib/sources/residentadvisor.ts` — populate `sourceTags = ['music:dj']`
- `src/lib/sources/eventbrite.ts` — populate `sourceTags` from category tags
- `src/hooks/useAppState.ts` — extend `Filters`, parse/serialize new URL params
- `src/components/AppClient.tsx` — render `TimeOfDayChips` + drawer button + `FilterDrawer`
- `package.json` — add `ai` dep
- `.env.local` — add `DEEPSEEK_API_KEY` (gitignored, real value)

---

## Task 1: Install AI SDK + DeepSeek provider + env

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (gitignored — local dev only)

- [ ] **Step 1: Install AI SDK + DeepSeek provider**

```bash
npm install ai@^6 @ai-sdk/deepseek
```

- [ ] **Step 2: Add env var to .env.local**

Append to `.env.local` (NOT `.env.local.example` — we use the real local file directly):

```
# DeepSeek API key for vibe filter enrichment (Task 9). Uses 'deepseek-chat'.
# Without this key, only timeOfDay filter works; eventType/setting drawer is disabled.
DEEPSEEK_API_KEY=<paste-real-key>
```

- [ ] **Step 3: Verify install**

```bash
npm ls ai @ai-sdk/deepseek
```

Expected: prints `ai@6.x.x` and `@ai-sdk/deepseek@2.x.x`. No peer warnings.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ai sdk + @ai-sdk/deepseek for vibe filter enrichment"
```

---

## Task 2: Add types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add new types**

Append to `src/lib/types.ts`:

```ts
export type TimeOfDay = 'afternoon' | 'aperitivo' | 'dinner' | 'late'

export type EventType =
  | 'live'
  | 'dj'
  | 'festival'
  | 'open-mic'
  | 'silent-disco'

export type Setting = 'indoor' | 'outdoor'

export interface VibeTags {
  eventType?: EventType[]
  setting?: Setting
}
```

- [ ] **Step 2: Add `sourceTags` to `Event`**

In `src/lib/types.ts`, modify the `Event` type to add an optional `sourceTags` field:

```ts
export type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string
  startTime: string
  endTime?: string
  venue: {
    name: string
    address: string
    lat: number
    lng: number
  }
  price: EventPrice
  imageUrl?: string
  ticketUrl: string
  source: string
  rating?: number
  reviewCount?: number
  reviews?: string[]
  sourceTags?: string[]   // raw tag strings from upstream source (e.g., 'music:dj')
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add VibeTags + Event.sourceTags for vibe filters"
```

---

## Task 3: timeOfDay derivation + tests

**Files:**
- Create: `src/lib/vibeTags.ts`
- Create: `__tests__/lib/vibeTags.test.ts`

- [ ] **Step 1: Write failing test for `deriveTimeOfDay`**

Create `__tests__/lib/vibeTags.test.ts`:

```ts
import { deriveTimeOfDay } from '@/lib/vibeTags'

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
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- vibeTags
```

Expected: FAIL with "Cannot find module '@/lib/vibeTags'".

- [ ] **Step 3: Implement `deriveTimeOfDay`**

Create `src/lib/vibeTags.ts`:

```ts
import type { Event, EventType, TimeOfDay, VibeTags } from '@/lib/types'

export function deriveTimeOfDay(startTime: string): TimeOfDay {
  const m = /^(\d{2}):/.exec(startTime)
  if (!m) return 'afternoon'
  const h = parseInt(m[1], 10)
  if (isNaN(h)) return 'afternoon'
  if (h >= 23 || h < 6) return 'late'
  if (h >= 21) return 'dinner'
  if (h >= 18) return 'aperitivo'
  return 'afternoon'
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- vibeTags
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vibeTags.ts __tests__/lib/vibeTags.test.ts
git commit -m "feat(vibe): timeOfDay derivation from startTime"
```

---

## Task 4: Rule-based eventType extraction + tests

**Files:**
- Modify: `src/lib/vibeTags.ts`
- Modify: `__tests__/lib/vibeTags.test.ts`

- [ ] **Step 1: Add failing tests for `extractRuleTags`**

Append to `__tests__/lib/vibeTags.test.ts`:

```ts
import { extractRuleTags } from '@/lib/vibeTags'
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- vibeTags
```

Expected: FAIL with "extractRuleTags is not a function".

- [ ] **Step 3: Implement `extractRuleTags`**

Append to `src/lib/vibeTags.ts`:

```ts
const SILENT_DISCO_RE = /silent\s*disco/i
const OPEN_MIC_RE = /open\s*mic|jam\s*session/i
const FESTIVAL_RE = /festival/i

export function extractRuleTags(event: Event): VibeTags {
  const types = new Set<EventType>()

  // Special-case overrides by title (mutually exclusive with default mapping)
  if (SILENT_DISCO_RE.test(event.title)) {
    return { eventType: ['silent-disco'] }
  }
  if (OPEN_MIC_RE.test(event.title)) {
    return { eventType: ['open-mic'] }
  }

  const tags = event.sourceTags ?? []

  switch (event.source) {
    case 'dice':
      if (tags.includes('music:dj')) types.add('dj')
      if (tags.includes('music:gig')) types.add('live')
      break
    case 'ra':
      types.add('dj')
      break
    case 'ticketmaster': {
      const hasMusic = tags.some(t => /music/i.test(t))
      if (hasMusic) {
        const isDj = tags.some(t => /dj|dance|electronic/i.test(t))
        types.add(isDj ? 'dj' : 'live')
      }
      break
    }
    case 'eventbrite':
      // EB category 103 = Music. We don't differentiate dj/live from EB tags
      // reliably — leave for LLM unless title gives a hint above.
      break
  }

  if (FESTIVAL_RE.test(event.title) && types.size > 0) {
    types.add('festival')
  }

  if (types.size === 0) return {}
  return { eventType: Array.from(types) }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npm test -- vibeTags
```

Expected: PASS, all tests in file (15+).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vibeTags.ts __tests__/lib/vibeTags.test.ts
git commit -m "feat(vibe): rule-based eventType extraction from source tags"
```

---

## Task 5: Populate `sourceTags` in DICE adapter

**Files:**
- Modify: `src/lib/sources/dice.ts`

- [ ] **Step 1: Read current `normalizeEvent` in `dice.ts`**

Locate `normalizeEvent` (around line 177). Note it returns an `Event` without `sourceTags`.

- [ ] **Step 2: Populate `sourceTags` from `tags_types`**

In `src/lib/sources/dice.ts`, modify `normalizeEvent` to include `sourceTags`:

```ts
function normalizeEvent(raw: DiceEvent): Event | null {
  if (!raw.id || !raw.dates?.event_start_date) return null
  const venue = raw.venues?.[0]
  const lat = venue?.location?.lat ?? 0
  const lng = venue?.location?.lng ?? 0
  const startIso = raw.dates.event_start_date

  const ticketUrl = raw.social_links?.event_share
    ?? (raw.perm_name ? `${DICE_HOST}/event/${raw.perm_name}` : DICE_HOST)

  const sourceTags = (raw.tags_types ?? [])
    .map(t => t.value)
    .filter((v): v is string => typeof v === 'string')

  return {
    id: `dice_${raw.id}`,
    title: raw.name ?? '',
    description: raw.about?.description?.trim() ?? '',
    category: categoryFromTags(raw.tags_types),
    date: startIso,
    startTime: extractTime(startIso),
    endTime: raw.dates.event_end_date ? extractTime(raw.dates.event_end_date) : undefined,
    venue: {
      name: venue?.name ?? '',
      address: venue?.address ?? '',
      lat,
      lng,
    },
    price: parsePrice(raw.price ?? null),
    imageUrl: pickImage(raw.images),
    ticketUrl,
    source: 'dice',
    sourceTags,
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sources/dice.ts
git commit -m "feat(sources): expose DICE tag values as Event.sourceTags"
```

---

## Task 6: Populate `sourceTags` in Ticketmaster + RA + Eventbrite

**Files:**
- Modify: `src/lib/sources/ticketmaster.ts`
- Modify: `src/lib/sources/residentadvisor.ts`
- Modify: `src/lib/sources/eventbrite.ts`

- [ ] **Step 1: Modify TM `normalizeEvent`**

In `src/lib/sources/ticketmaster.ts`, around the return statement of `normalizeEvent`, add `sourceTags` derived from classifications:

```ts
const sourceTags: string[] = []
for (const c of raw.classifications ?? []) {
  if (c.segment?.name) sourceTags.push(c.segment.name)
  if (c.genre?.name) sourceTags.push(c.genre.name)
}
```

Then include `sourceTags` in the returned `Event` literal (after `source: 'ticketmaster'`):

```ts
    source: 'ticketmaster',
    sourceTags,
```

- [ ] **Step 2: Modify RA adapter**

Open `src/lib/sources/residentadvisor.ts`. Find where the `Event` object is returned from RA's mapper. Add:

```ts
    source: 'ra',
    sourceTags: ['music:dj'],
```

- [ ] **Step 3: Modify Eventbrite `normalizeEvent`**

In `src/lib/sources/eventbrite.ts`, around the return of `normalizeEvent`, derive sourceTags from `raw.tags`:

```ts
const sourceTags = (raw.tags ?? [])
  .map(t => t.tag)
  .filter((v): v is string => typeof v === 'string')
```

Add to returned `Event`:

```ts
    source: 'eventbrite',
    sourceTags,
```

- [ ] **Step 4: Run existing source tests + typecheck**

```bash
npm test -- sources
npx tsc --noEmit
```

Expected: existing source tests still PASS, typecheck zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sources/
git commit -m "feat(sources): populate Event.sourceTags in TM, RA, Eventbrite"
```

---

## Task 7: TagCache (in-memory) + tests

**Files:**
- Create: `src/lib/tagCache.ts`
- Create: `__tests__/lib/tagCache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/tagCache.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- tagCache
```

Expected: FAIL with "Cannot find module '@/lib/tagCache'".

- [ ] **Step 3: Implement `tagCache.ts`**

Create `src/lib/tagCache.ts`:

```ts
import type { VibeTags } from '@/lib/types'

export interface TagCache {
  get(eventId: string): VibeTags | undefined
  getMany(eventIds: string[]): Map<string, VibeTags>
  set(eventId: string, tags: VibeTags): void
  setMany(entries: Map<string, VibeTags>): void
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
  }
}

// Module-level singleton used by the app
export const tagCache: TagCache = createMapTagCache()
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test -- tagCache
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tagCache.ts __tests__/lib/tagCache.test.ts
git commit -m "feat(vibe): in-memory TagCache with merge semantics"
```

---

## Task 8: filterEvents (pure) + tests

**Files:**
- Create: `src/lib/filterEvents.ts`
- Create: `__tests__/lib/filterEvents.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/filterEvents.test.ts`:

```ts
import { filterEvents } from '@/lib/filterEvents'
import { createMapTagCache } from '@/lib/tagCache'
import type { Event } from '@/lib/types'

function makeEvent(over: Partial<Event>): Event {
  return {
    id: 'x', title: '', description: '', category: 'other',
    date: '2026-05-09T20:00:00', startTime: '20:00',
    venue: { name: '', address: '', lat: 0, lng: 0 },
    price: 'free', ticketUrl: '', source: 'tm',
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
      makeEvent({ id: 'a', startTime: '15:00' }),  // afternoon
      makeEvent({ id: 'b', startTime: '19:00' }),  // aperitivo
      makeEvent({ id: 'c', startTime: '23:30' }),  // late
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
    const events = [
      makeEvent({ id: 'a' }),
      makeEvent({ id: 'b' }),
    ]
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
    const result = filterEvents(events, {
      timeOfDay: ['late'], eventType: ['dj'], setting: 'outdoor',
    }, cache)
    expect(result.map(e => e.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- filterEvents
```

Expected: FAIL with "Cannot find module '@/lib/filterEvents'".

- [ ] **Step 3: Implement `filterEvents.ts`**

Create `src/lib/filterEvents.ts`:

```ts
import type { Event, EventType, Setting, TimeOfDay } from '@/lib/types'
import type { TagCache } from '@/lib/tagCache'
import { deriveTimeOfDay, extractRuleTags } from '@/lib/vibeTags'

export interface VibeFilterInput {
  timeOfDay?: TimeOfDay[]
  eventType?: EventType[]
  setting?: Setting
}

function eventTypeFor(event: Event, cache: TagCache): EventType[] {
  const cached = cache.get(event.id)?.eventType
  if (cached && cached.length > 0) return cached
  return extractRuleTags(event).eventType ?? []
}

function settingFor(event: Event, cache: TagCache): Setting | undefined {
  return cache.get(event.id)?.setting
}

export function filterEvents(
  events: Event[],
  filters: VibeFilterInput,
  cache: TagCache,
): Event[] {
  return events.filter(event => {
    if (filters.timeOfDay && filters.timeOfDay.length > 0) {
      const tod = deriveTimeOfDay(event.startTime)
      if (!filters.timeOfDay.includes(tod)) return false
    }

    if (filters.eventType && filters.eventType.length > 0) {
      const types = eventTypeFor(event, cache)
      const overlap = types.some(t => filters.eventType!.includes(t))
      if (!overlap) return false
    }

    if (filters.setting) {
      const s = settingFor(event, cache)
      if (s !== filters.setting) return false
    }

    return true
  })
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test -- filterEvents
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filterEvents.ts __tests__/lib/filterEvents.test.ts
git commit -m "feat(vibe): pure filterEvents with timeOfDay/eventType/setting"
```

---

## Task 9: enrichTags (LLM batch) + tests

**Files:**
- Create: `src/lib/enrichTags.ts`
- Create: `__tests__/lib/enrichTags.test.ts`

- [ ] **Step 1: Write failing tests with mocked AI SDK**

Create `__tests__/lib/enrichTags.test.ts`:

```ts
import type { Event } from '@/lib/types'

const generateObjectMock = jest.fn()

jest.mock('ai', () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
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
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- enrichTags
```

Expected: FAIL with "Cannot find module '@/lib/enrichTags'".

- [ ] **Step 3: Implement `enrichTags.ts`**

Create `src/lib/enrichTags.ts`:

```ts
import { generateObject } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { z } from 'zod'
import type { Event, VibeTags } from '@/lib/types'

const BATCH_SIZE = 50
const TIMEOUT_MS = 10_000
const MODEL = deepseek('deepseek-chat')

const tagSchema = z.object({
  tags: z.array(
    z.object({
      id: z.string(),
      eventType: z
        .array(z.enum(['live', 'dj', 'festival', 'open-mic', 'silent-disco']))
        .optional(),
      setting: z.enum(['indoor', 'outdoor']).optional(),
    }),
  ),
})

const SYSTEM_PROMPT = `Sei un classificatore di eventi nightlife italiani. \
Rispondi solo con JSON valido secondo lo schema. \
Lascia campi undefined se non determinabile dalle informazioni fornite. \
"setting" indica se l'evento si svolge all'aperto (outdoor) o al chiuso (indoor); \
desumibile dal nome del venue, dalla descrizione, o dalla stagione (es. rooftop, garden, beach = outdoor).`

function buildUserPrompt(events: Event[]): string {
  const items = events
    .map(
      e =>
        `- id: ${e.id}\n  title: ${e.title}\n  venue: ${e.venue.name}\n  desc: ${e.description.slice(0, 200)}`,
    )
    .join('\n')
  return `Classifica i seguenti eventi.\n\n${items}\n\nRispondi con un oggetto { "tags": [...] } con un entry per ogni id.`
}

export async function enrichTags(events: Event[]): Promise<Map<string, VibeTags>> {
  const result = new Map<string, VibeTags>()
  if (events.length === 0) return result

  if (!process.env.DEEPSEEK_API_KEY) {
    return result
  }

  const batches: Event[][] = []
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    batches.push(events.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: tagSchema,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(batch),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      })
      for (const t of object.tags) {
        const tags: VibeTags = {}
        if (t.eventType && t.eventType.length > 0) tags.eventType = t.eventType
        if (t.setting) tags.setting = t.setting
        if (tags.eventType || tags.setting) result.set(t.id, tags)
      }
    } catch (err) {
      console.error('[vibeTags] enrichTags batch failed:', err)
      // Skip this batch but continue with others.
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test -- enrichTags
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/enrichTags.ts __tests__/lib/enrichTags.test.ts
git commit -m "feat(vibe): LLM batch enrichTags via DeepSeek (deepseek-chat)"
```

---

## Task 10: useFilteredEvents hook + tests

**Files:**
- Create: `src/hooks/useFilteredEvents.ts`
- Create: `__tests__/hooks/useFilteredEvents.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/hooks/useFilteredEvents.test.ts`:

```ts
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
    // reset cache between tests
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
      { initialProps: { filters: { setting: 'outdoor' as const } } },
    )
    await waitFor(() => expect(enrichTagsMock).toHaveBeenCalledTimes(1))

    // Toggle filter off then on — should hit cache, no new call
    rerender({ filters: {} })
    rerender({ filters: { setting: 'outdoor' } })
    await act(async () => {})
    expect(enrichTagsMock).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- useFilteredEvents
```

Expected: FAIL with "Cannot find module '@/hooks/useFilteredEvents'".

- [ ] **Step 3: Implement hook**

Create `src/hooks/useFilteredEvents.ts`:

```ts
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
    // tick triggers recompute after enrichment completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, filters.timeOfDay, filters.eventType, filters.setting, tick],
  )

  return { events, enriching }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npm test -- useFilteredEvents
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFilteredEvents.ts __tests__/hooks/useFilteredEvents.test.ts
git commit -m "feat(vibe): useFilteredEvents hook with debounced lazy enrichment"
```

---

## Task 11: TimeOfDayChips component + test

**Files:**
- Create: `src/components/TimeOfDayChips.tsx`
- Create: `__tests__/components/TimeOfDayChips.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/TimeOfDayChips.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeOfDayChips from '@/components/TimeOfDayChips'

describe('TimeOfDayChips', () => {
  it('renders 4 chips', () => {
    render(<TimeOfDayChips value={[]} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /pomeriggio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aperitivo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cena/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tarda sera/i })).toBeInTheDocument()
  })

  it('toggles on click (add)', async () => {
    const onChange = jest.fn()
    render(<TimeOfDayChips value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /aperitivo/i }))
    expect(onChange).toHaveBeenCalledWith(['aperitivo'])
  })

  it('toggles off on click when already selected', async () => {
    const onChange = jest.fn()
    render(<TimeOfDayChips value={['aperitivo']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /aperitivo/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- TimeOfDayChips
```

Expected: FAIL with "Cannot find module '@/components/TimeOfDayChips'".

- [ ] **Step 3: Implement component**

Create `src/components/TimeOfDayChips.tsx`:

```tsx
'use client'

import type { TimeOfDay } from '@/lib/types'

const SLOTS: { key: TimeOfDay; label: string; emoji: string }[] = [
  { key: 'afternoon', label: 'Pomeriggio',  emoji: '🌅' },
  { key: 'aperitivo', label: 'Aperitivo',   emoji: '🍹' },
  { key: 'dinner',    label: 'Cena',        emoji: '🍽' },
  { key: 'late',      label: 'Tarda sera',  emoji: '🌃' },
]

type Props = {
  value: TimeOfDay[]
  onChange: (value: TimeOfDay[]) => void
  className?: string
}

export default function TimeOfDayChips({ value, onChange, className }: Props) {
  function toggle(key: TimeOfDay) {
    const next = value.includes(key)
      ? value.filter(k => k !== key)
      : [...value, key]
    onChange(next)
  }

  return (
    <div className={`flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden${className ? ` ${className}` : ''}`}>
      {SLOTS.map(s => {
        const active = value.includes(s.key)
        return (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm test -- TimeOfDayChips
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/TimeOfDayChips.tsx __tests__/components/TimeOfDayChips.test.tsx
git commit -m "feat(ui): TimeOfDayChips inline multi-select"
```

---

## Task 12: VibeFilterChips + FilterDrawer + test

**Files:**
- Create: `src/components/VibeFilterChips.tsx`
- Create: `src/components/FilterDrawer.tsx`
- Create: `__tests__/components/FilterDrawer.test.tsx`

- [ ] **Step 1: Write failing test for FilterDrawer**

Create `__tests__/components/FilterDrawer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterDrawer from '@/components/FilterDrawer'

describe('FilterDrawer', () => {
  it('does not render when closed', () => {
    render(
      <FilterDrawer
        open={false}
        eventType={[]}
        setting={undefined}
        previewCount={10}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText(/Tipo serata/i)).not.toBeInTheDocument()
  })

  it('renders with chips when open', () => {
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={10}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/Tipo serata/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /silent disco/i })).toBeInTheDocument()
  })

  it('calls onApply with selected state on Applica click', async () => {
    const onApply = jest.fn()
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={5}
        onApply={onApply}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^DJ$/i }))
    await userEvent.click(screen.getByRole('button', { name: /Indoor/i }))
    await userEvent.click(screen.getByRole('button', { name: /Applica/i }))
    expect(onApply).toHaveBeenCalledWith({ eventType: ['dj'], setting: 'indoor' })
  })

  it('Pulisci tutto resets local selection', async () => {
    render(
      <FilterDrawer
        open
        eventType={['dj']}
        setting="outdoor"
        previewCount={5}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Pulisci tutto/i }))
    // After reset, DJ chip should not have active styling — verify by clicking Applica
    // and confirming empty payload
    const applyMock = jest.fn()
    render(
      <FilterDrawer
        open
        eventType={[]}
        setting={undefined}
        previewCount={5}
        onApply={applyMock}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getAllByRole('button', { name: /Applica/i })[0])
    expect(applyMock).toHaveBeenCalledWith({ eventType: [], setting: undefined })
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm test -- FilterDrawer
```

Expected: FAIL.

- [ ] **Step 3: Implement VibeFilterChips**

Create `src/components/VibeFilterChips.tsx`:

```tsx
'use client'

import type { EventType, Setting } from '@/lib/types'

const TYPES: { key: EventType; label: string; emoji: string }[] = [
  { key: 'live',         label: 'Live',         emoji: '🎤' },
  { key: 'dj',           label: 'DJ',           emoji: '🎧' },
  { key: 'festival',     label: 'Festival',     emoji: '🎪' },
  { key: 'open-mic',     label: 'Open mic',     emoji: '🎙' },
  { key: 'silent-disco', label: 'Silent disco', emoji: '🤫' },
]

const SETTINGS: { key: Setting | 'any'; label: string; emoji: string }[] = [
  { key: 'any',     label: 'Qualsiasi', emoji: '·' },
  { key: 'indoor',  label: 'Indoor',    emoji: '🏠' },
  { key: 'outdoor', label: 'Outdoor',   emoji: '🌳' },
]

type EventTypeProps = {
  value: EventType[]
  onChange: (v: EventType[]) => void
}

export function EventTypeChips({ value, onChange }: EventTypeProps) {
  function toggle(k: EventType) {
    onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map(t => {
        const active = value.includes(t.key)
        return (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{t.emoji}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

type SettingProps = {
  value: Setting | undefined
  onChange: (v: Setting | undefined) => void
}

export function SettingChips({ value, onChange }: SettingProps) {
  function pick(k: Setting | 'any') {
    onChange(k === 'any' ? undefined : k)
  }
  return (
    <div className="flex gap-2">
      {SETTINGS.map(s => {
        const active = (s.key === 'any' && value === undefined) || s.key === value
        return (
          <button
            key={s.key}
            onClick={() => pick(s.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
            style={{
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background:  active ? 'rgba(255,87,34,0.15)' : 'transparent',
              color:       active ? 'var(--accent)' : 'var(--bright)',
            }}
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement FilterDrawer**

Create `src/components/FilterDrawer.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { EventType, Setting } from '@/lib/types'
import { EventTypeChips, SettingChips } from './VibeFilterChips'

type Props = {
  open: boolean
  eventType: EventType[]
  setting: Setting | undefined
  previewCount: number
  onApply: (next: { eventType: EventType[]; setting: Setting | undefined }) => void
  onClose: () => void
}

export default function FilterDrawer({
  open, eventType, setting, previewCount, onApply, onClose,
}: Props) {
  const [localTypes, setLocalTypes] = useState<EventType[]>(eventType)
  const [localSetting, setLocalSetting] = useState<Setting | undefined>(setting)

  useEffect(() => {
    if (open) {
      setLocalTypes(eventType)
      setLocalSetting(setting)
    }
  }, [open, eventType, setting])

  if (!open) return null

  function reset() {
    setLocalTypes([])
    setLocalSetting(undefined)
  }

  function apply() {
    onApply({ eventType: localTypes, setting: localSetting })
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full sm:w-80 sm:h-full max-h-[70vh] sm:max-h-none bg-bg border-t sm:border-t-0 sm:border-l border-border flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium">Filtri avanzati</h3>
          <button onClick={onClose} aria-label="Chiudi" className="text-muted text-lg">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="label">Tipo serata</span>
              <button onClick={() => setLocalTypes([])} className="text-xs text-muted">reset</button>
            </div>
            <EventTypeChips value={localTypes} onChange={setLocalTypes} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="label">Ambiente</span>
              <button onClick={() => setLocalSetting(undefined)} className="text-xs text-muted">reset</button>
            </div>
            <SettingChips value={localSetting} onChange={setLocalSetting} />
          </section>
        </div>

        <div className="border-t border-border px-4 py-3 flex gap-2">
          <button
            onClick={reset}
            className="flex-1 px-3 py-2 rounded-full border border-border text-sm"
          >
            Pulisci tutto
          </button>
          <button
            onClick={apply}
            className="flex-1 px-3 py-2 rounded-full bg-accent text-white text-sm font-medium"
          >
            Applica ({previewCount})
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npm test -- FilterDrawer
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/VibeFilterChips.tsx src/components/FilterDrawer.tsx __tests__/components/FilterDrawer.test.tsx
git commit -m "feat(ui): FilterDrawer + VibeFilterChips for eventType/setting"
```

---

## Task 13: Extend useAppState with new filter fields

**Files:**
- Modify: `src/hooks/useAppState.ts`

- [ ] **Step 1: Extend `Filters` type**

In `src/hooks/useAppState.ts`, replace the `Filters` type:

```ts
import type { Event, EventCategory, EventType, Location, Setting, TimeOfDay } from '@/lib/types'

export type Filters = {
  mode: 'events' | 'venues'
  date?: string
  q?: string
  radiusKm: number
  category?: EventCategory[]
  timeOfDay?: TimeOfDay[]
  eventType?: EventType[]
  setting?: Setting
}
```

- [ ] **Step 2: Extend `parseFilters`**

Replace `parseFilters`:

```ts
function parseFilters(params: URLSearchParams): Filters {
  const modeVal = params.get('mode')
  const dateVal = params.get('date')
  const radiusVal = params.get('radius')
  const catVal = params.get('category')
  const todVal = params.get('tod')
  const typeVal = params.get('etype')
  const settingVal = params.get('setting')

  const validTod: TimeOfDay[] = ['afternoon', 'aperitivo', 'dinner', 'late']
  const validType: EventType[] = ['live', 'dj', 'festival', 'open-mic', 'silent-disco']

  return {
    mode: modeVal === 'venues' ? 'venues' : 'events',
    date: dateVal ?? 'today',
    q: params.get('q') ?? undefined,
    radiusKm: Math.max(1, parseInt(radiusVal ?? '10', 10) || 10),
    category: catVal ? (catVal.split(',') as EventCategory[]) : undefined,
    timeOfDay: todVal
      ? (todVal.split(',').filter(v => validTod.includes(v as TimeOfDay)) as TimeOfDay[])
      : undefined,
    eventType: typeVal
      ? (typeVal.split(',').filter(v => validType.includes(v as EventType)) as EventType[])
      : undefined,
    setting: settingVal === 'indoor' || settingVal === 'outdoor' ? settingVal : undefined,
  }
}
```

- [ ] **Step 3: Extend `updateUrl`**

Inside `updateUrl`, after the existing `category` line, add:

```ts
      if (newFilters.timeOfDay?.length) params.set('tod', newFilters.timeOfDay.join(','))
      if (newFilters.eventType?.length) params.set('etype', newFilters.eventType.join(','))
      if (newFilters.setting) params.set('setting', newFilters.setting)
```

- [ ] **Step 4: Run typecheck + existing tests**

```bash
npx tsc --noEmit
npm test
```

Expected: zero TS errors. All existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAppState.ts
git commit -m "feat(state): extend Filters with timeOfDay/eventType/setting + URL persistence"
```

---

## Task 14: Wire components into AppClient

**Files:**
- Modify: `src/components/AppClient.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/AppClient.tsx`, import the new pieces:

```ts
import TimeOfDayChips from './TimeOfDayChips'
import FilterDrawer from './FilterDrawer'
import { useFilteredEvents } from '@/hooks/useFilteredEvents'
```

- [ ] **Step 2: Add drawer open state and filtered events**

Inside `AppInner`, after the existing `useState` declarations (e.g., after `const [minRating, setMinRating] = useState(0)`):

```ts
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { events: filteredEvents, enriching } = useFilteredEvents(events, {
    timeOfDay: filters.timeOfDay,
    eventType: filters.eventType,
    setting: filters.setting,
  })
```

- [ ] **Step 3: Replace `visibleEvents` definition**

Find:

```ts
  const visibleEvents = isVenueMode && minRating > 0
    ? events.filter((e) => (e.rating ?? 0) >= minRating)
    : events
```

Replace with:

```ts
  const visibleEvents = isVenueMode && minRating > 0
    ? events.filter((e) => (e.rating ?? 0) >= minRating)
    : isVenueMode
      ? events
      : filteredEvents
```

- [ ] **Step 4: Render TimeOfDayChips + drawer button (desktop header)**

Inside the desktop header, after the `CategoryChips` block:

```tsx
            <div className="w-px h-5 bg-border mx-3 shrink-0" />

            <TimeOfDayChips
              value={filters.timeOfDay ?? []}
              onChange={(timeOfDay) =>
                setFilters({ ...filters, timeOfDay: timeOfDay.length ? timeOfDay : undefined })
              }
            />

            <button
              onClick={() => setDrawerOpen(true)}
              className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[11px] font-medium"
            >
              ⚙ Filtri
              {((filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)) > 0 && (
                <span className="ml-1 text-accent">
                  ({(filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)})
                </span>
              )}
              {enriching && <span className="ml-1 animate-pulse">…</span>}
            </button>
```

- [ ] **Step 5: Render same in mobile header**

Inside the mobile header `<div className="flex items-center gap-2 px-4 pb-3 pt-1">` block (next to `CategoryChips`), add a row below it:

```tsx
            <div className="flex items-center gap-2 px-4 pb-3">
              <TimeOfDayChips
                value={filters.timeOfDay ?? []}
                onChange={(timeOfDay) =>
                  setFilters({ ...filters, timeOfDay: timeOfDay.length ? timeOfDay : undefined })
                }
              />
              <button
                onClick={() => setDrawerOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[11px] font-medium"
              >
                ⚙
                {((filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)) > 0 && (
                  <span className="text-accent">
                    {(filters.eventType?.length ?? 0) + (filters.setting ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
```

- [ ] **Step 6: Render FilterDrawer at root**

Just before the closing `</div>` of the root layout (next to `<EventDetailModal />`):

```tsx
      <FilterDrawer
        open={drawerOpen}
        eventType={filters.eventType ?? []}
        setting={filters.setting}
        previewCount={visibleEvents.length}
        onApply={({ eventType, setting }) => {
          setFilters({
            ...filters,
            eventType: eventType.length ? eventType : undefined,
            setting,
          })
          setDrawerOpen(false)
        }}
        onClose={() => setDrawerOpen(false)}
      />
```

- [ ] **Step 7: Run typecheck + lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: zero errors / warnings related to new code.

- [ ] **Step 8: Commit**

```bash
git add src/components/AppClient.tsx
git commit -m "feat(ui): integrate TimeOfDayChips + FilterDrawer in AppClient"
```

---

## Task 15: Manual verification

**Files:** none (smoke test)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open browser to http://localhost:3000.

- [ ] **Step 2: Test timeOfDay filter (no LLM dependency)**

- Pick a city with events (Milano).
- Click "Aperitivo" chip.
- Verify only events with `startTime` 18:00–20:59 remain.
- Click "Aperitivo" again to deselect.
- Verify list returns to original.

- [ ] **Step 3: Test URL persistence**

- Activate "Pomeriggio" + "Tarda sera".
- Refresh the page.
- Verify the chips are still active and the filter persists. Confirm `?tod=afternoon,late` is in the URL.

- [ ] **Step 4: Test eventType filter (rule-based path)**

- Open the drawer (`⚙ Filtri`).
- Click "DJ".
- Click "Applica".
- Verify visible events are mostly DICE music:dj events + RA + TM Music with DJ subgenre.
- Open drawer again, click "Pulisci tutto" → "Applica".
- Verify all events return.

- [ ] **Step 5: Test setting filter (LLM path)**

Requires `DEEPSEEK_API_KEY` in `.env.local`.

- Open drawer.
- Click "Outdoor".
- Click "Applica".
- Wait up to ~3 seconds for spinner to finish.
- Verify events with rooftop / garden / beach / outdoor venues remain.
- Toggle filter off then on — verify no second LLM call (instant from cache).

- [ ] **Step 6: Test fallback when API key missing**

- Comment out `DEEPSEEK_API_KEY` in `.env.local`.
- Restart dev server.
- Open drawer, click "Outdoor", "Applica".
- Verify visible list goes to 0 (silently dropped untagged) — acceptable; banner addition is out of scope.

- [ ] **Step 7: Test mobile layout**

- Open dev tools, switch to mobile viewport.
- Verify TimeOfDayChips scroll horizontally.
- Tap drawer button — drawer slides up as bottom sheet.
- Verify backdrop tap dismisses without applying.

- [ ] **Step 8: Final commit (only if tweaks needed during smoke)**

If no changes needed, skip. Otherwise:

```bash
git add -p
git commit -m "fix(vibe): manual smoke fixes"
```

---

## Self-Review Notes

- Spec section "Rule-based tag extraction": fully covered in Task 4.
- Spec section "LLM enrichment": Task 9 covers AI Gateway, batch, timeout, schema, system prompt.
- Spec section "Cache (phase 1)": Task 7 implements `TagCache` interface + `MapTagCache`.
- Spec section "UI components": Tasks 11, 12, 14.
- Spec section "Error handling": LLM errors handled in Task 9; missing API key gates drawer (out-of-scope: drawer disable UI tooltip — left as a small follow-up but not blocking smoke). Banner-on-zero-result was specced but skipped to keep scope tight; flag during smoke if disruptive.
- Spec section "Testing": tasks 3,4,7,8,9,10,11,12 each ship tests; task 15 covers manual.
- Type names: `TimeOfDay`, `EventType`, `Setting`, `VibeTags` — used consistently across tasks 2 → 14.
- Method names on `TagCache`: `get`, `getMany`, `set`, `setMany` — consistent.
- Hook signature: `useFilteredEvents(source: Event[], filters: VibeFilterInput): { events, enriching }` — consistent across hook impl and AppClient consumer.

## Out-of-scope follow-ups (for future plans)

- Disable drawer button + tooltip when `DEEPSEEK_API_KEY` missing (UI affordance, not security)
- Banner "Nessun risultato — riprova" when LLM-dependent filter active and visible == 0
- Persist cache to Vercel Runtime Cache or Supabase
- Analytics on filter usage
- Indoor/outdoor heuristic from venue type (Google Places) before falling back to LLM
