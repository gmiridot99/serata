# Venue Enrichment — Design Spec
Date: 2026-05-03

## Goal

Upgrade the venues mode from a raw list to an intelligent experience:
- Rating visible on every venue card
- Filter by minimum rating (chips)
- AI-generated summary + vibe tags lazy-loaded in the detail modal

## Decisions

| Topic | Decision |
|---|---|
| Rating source | Google Places API (already wired) |
| AI model | Claude Haiku 4.5 |
| AI cache | Next.js `unstable_cache` (in-memory, no infra) |
| Rating filter | Client-side chips — no refetch |
| UI language | Italian, consistent with existing design system |

---

## Section 1 — Data Layer

### `src/lib/types.ts`

Add three optional fields to `Event`:

```ts
rating?: number        // e.g. 4.3
reviewCount?: number   // e.g. 847
reviews?: string[]     // up to 5 raw review texts from Google
```

### `src/lib/sources/places.ts`

Add to `FIELDS`:
```
places.rating,places.userRatingCount,places.reviews
```

Add to `GooglePlace` type:
```ts
rating?: number
userRatingCount?: number
reviews?: Array<{ text: { text: string }; rating: number; authorAttribution: { displayName: string } }>
```

Map in `normalizePlaceToEvent`:
```ts
rating: place.rating,
reviewCount: place.userRatingCount,
reviews: place.reviews?.slice(0, 5).map(r => r.text.text) ?? [],
```

---

## Section 2 — Rating on Card + Filter Chips

### `src/components/EventCard.tsx`

When `event.source === 'places'` and `event.rating`:
- **`row` variant**: replace the empty `startTime` slot (`text-lg font-bold`) with `⭐ 4.3` in the same position; append `· 847` in `text-muted text-[10px]`
- **`featured` variant**: replace the large `startTime` display with `⭐ 4.3` at `text-3xl font-black`, count below at `text-xs text-bright`
- Font/color consistent with existing design tokens, no new styles introduced

No changes for non-venue events.

### `src/components/RatingChips.tsx` (new)

```
[ Tutti ] [ ⭐ 3+ ] [ ⭐ 4+ ] [ ⭐ 4.5+ ]
```

- Style mirrors `CategoryChips` — same pill shape, `bg-elev` inactive, `bg-accent text-bg` active
- Emits `onChange(minRating: number)` — 0 = "Tutti"
- Shown only when `mode === 'venues'`

### `src/components/AppClient.tsx`

Add local state `minRating: number` (default 0). Does NOT go into `filters` — avoids API refetch.

Filter applied before passing to `SplitView`:
```ts
const visibleEvents = minRating > 0
  ? events.filter(e => (e.rating ?? 0) >= minRating)
  : events
```

Place `RatingChips` below `VenueSearch`, visible only in venues mode.

---

## Section 3 — AI Summary in Detail Modal

### `src/lib/enrichVenue.ts` (new)

```ts
export type VenueEnrichment = {
  vibe: string[]       // e.g. ["tranquillo", "romantico", "elegante"]
  noise_level: string  // "silenzioso" | "moderato" | "animato" | "molto rumoroso"
  age_range: string    // e.g. "25-40"
  best_for: string[]   // e.g. ["coppia", "prima serata", "dopo cena"]
  summary_it: string   // 2-3 sentence Italian summary
}

export async function enrichVenue(placeId: string, reviews: string[]): Promise<VenueEnrichment>
```

Wrapped with `unstable_cache` keyed on `placeId`, `revalidate: 86400` (24h explicit — default is indefinite).

Claude Haiku 4.5 prompt:
- System: "Sei un assistente che analizza recensioni di locali italiani."
- User: reviews joined, ask for JSON output matching the schema
- Use `JSON.parse` on response, validate fields exist, fallback to empty arrays if malformed

### `src/app/api/enrich-venue/route.ts` (new)

```
POST /api/enrich-venue
Body: { placeId: string, reviews: string[] }
Response: VenueEnrichment JSON
```

Validates `placeId` is non-empty string. Calls `enrichVenue()`. Returns 200 JSON or 500 on error.

### `src/components/EventDetailModal.tsx`

When `isPlace`:

1. **Rating row** (below title, above info card):
   ```
   ⭐ 4.3  ·  847 recensioni
   ```
   Large `text-2xl font-bold text-text` for the number, `text-muted text-sm` for count.

2. **AI Summary section** (after info card, before map):
   - `useEffect` on mount: `POST /api/enrich-venue` with `{ placeId: event.id.replace('places_', ''), reviews: event.reviews ?? [] }`
   - State: `'idle' | 'loading' | 'done' | 'error'`
   - Loading: skeleton pulse (2 lines, same style as existing `bg-card rounded-2xl`)
   - Done:
     - `summary_it` paragraph — `text-sm text-muted leading-relaxed`
     - `vibe[]` pills — `bg-accent/15 text-accent text-xs px-2 py-0.5 rounded-full`
     - `best_for[]` pills — `bg-card text-bright text-xs px-2 py-0.5 rounded-full`
   - Error: silent fail (no visible error to user)

All new UI elements use the existing design tokens (`bg-card`, `text-muted`, `text-accent`, `border-border`, `rounded-2xl`) — no new colors introduced.

---

## Out of Scope

- Persistent cache (Vercel KV) — future upgrade
- Bandsintown / Eventbrite enrichment — not applicable
- Filtering by vibe tags — future feature
- Displaying raw review texts — too noisy, AI summary replaces them

---

## File Checklist

| File | Action |
|---|---|
| `src/lib/types.ts` | edit — add 3 optional fields |
| `src/lib/sources/places.ts` | edit — extend FIELDS + type + normalization |
| `src/lib/enrichVenue.ts` | new |
| `src/app/api/enrich-venue/route.ts` | new |
| `src/components/RatingChips.tsx` | new |
| `src/components/EventCard.tsx` | edit — venue rating badge |
| `src/components/AppClient.tsx` | edit — minRating state + filter + RatingChips |
| `src/components/EventDetailModal.tsx` | edit — rating row + AI summary section |
