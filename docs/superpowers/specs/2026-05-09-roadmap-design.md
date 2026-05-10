# Serata — Roadmap Design

**Date:** 2026-05-09  
**Status:** Approved

---

## Scope

Three-phase roadmap covering the remaining high-value features for the serata app. Items are ordered by priority and dependency.

---

## Phase 1 — LLM Search Pipeline

*Highest priority. Core product value. Items 1A→1C are sequential — each is a prerequisite for the next.*

### 1A · Event Serialization

A pure function `serializeEventsForLLM(events: Event[]): string` that converts the visible event list into a compact JSON string suitable for LLM context injection.

**Output shape per event:**
```json
{
  "id": "ra_123",
  "title": "Drumcode Night",
  "venue": "Fabric, Via Forcella 3",
  "date": "2026-05-10",
  "startTime": "23:00",
  "tags": ["music:dj", "outdoor"],
  "lat": 45.46,
  "lng": 9.19
}
```

Fields omitted if empty. Total payload target: < 8k tokens for 50 events.

**Location:** `src/lib/serializeEvents.ts`

---

### 1B · Search API

**Endpoint:** `POST /api/search`

**Request:**
```json
{
  "query": "techno outdoor sabato sera",
  "events": "<serialized event list from 1A>"
}
```

**Response:**
```json
{
  "filters": {
    "eventType": ["dj"],
    "setting": "outdoor",
    "timeOfDay": ["late"]
  },
  "rankedIds": ["ra_123", "dice_456"],
  "reasons": {
    "ra_123": "DJ set outdoor, inizia tardi",
    "dice_456": "Techno open air"
  }
}
```

Model: DeepSeek (same as enrich-tags). System prompt instructs the model to:
1. Parse the natural language query into `VibeFilterInput` fields
2. Rank events from the provided list that best match the query
3. Return a short Italian reason per ranked event

Error handling: if model call fails or response is malformed, return `{ filters: {}, rankedIds: [], reasons: {} }` — UI degrades gracefully to showing no AI results.

**Location:** `src/app/api/search/route.ts`

---

### 1C · Search UI

**Search bar:** already present as `VenueSearch` component in venues mode. For events mode, repurpose or create a parallel `EventSearch` input in the header.

**Behavior on submit:**
1. Serialize visible events via 1A
2. Call `/api/search` with query + serialized events
3. Apply returned `filters` → updates drawer filter state (same as manual drawer apply)
4. Show "Serate consigliate" panel above the event list with `rankedIds` events highlighted + `reasons` text

**"Serate consigliate" panel:**
- Appears only when search has returned results
- Shows top N (≤5) ranked events as compact cards with AI reason subtitle
- Dismissable (X button clears search state)
- Does not replace the main list — coexists below the panel

**Loading state:** search button shows spinner while `/api/search` is in flight. Filters not applied until response arrives.

**Location:** `src/components/EventSearch.tsx`, changes to `src/components/AppClient.tsx`

---

## Phase 2 — Instagram Source

*Medium priority. Inherently fragile (scraping). Designed to fail gracefully — if Instagram blocks, the source returns `[]` silently like any other failing source.*

### 2A · Venue → Instagram Handle Resolution

Given a venue name + city, find its Instagram username.

**Strategy:** Use Google search (via `/api/geocode` pattern or a new `/api/ig-handle`) with query `"<venue name> <city> site:instagram.com"` → extract handle from first result URL.

Cache results in `unstable_cache` with 7-day TTL (handles don't change often).

**Location:** `src/lib/resolveInstagramHandle.ts`

---

### 2B · Post Scraping

Given a handle, fetch the public Instagram profile page and extract captions from the last N posts (target: 12 posts).

**Method:** GET `https://www.instagram.com/<handle>/` with browser User-Agent, parse the embedded `window.__additionalDataLoaded` or `__Extra` JSON blobs. Instagram rate-limits aggressively — add 1s jitter between requests.

**Fallback:** if Instagram returns 429 or blocks JSON extraction, return `[]`.

**Location:** `src/lib/scrapeInstagramPosts.ts`

---

### 2C · LLM Caption Parsing

Given an array of post captions (strings), call DeepSeek to extract events. System prompt instructs model to return only posts that describe a specific upcoming event (date + time required), ignoring generic promotional content.

**Output per caption:**
```json
{
  "title": "Nome evento",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "price": "free | number",
  "description": "breve testo"
}
```

If date cannot be inferred with confidence: skip the event.

**Location:** `src/lib/parseInstagramCaptions.ts`

---

### 2D · EventSource Integration

`InstagramSource` implements the `EventSource` interface:

```typescript
class InstagramSource implements EventSource {
  async fetch(query: EventQuery): Promise<Event[]>
}
```

**Flow:**
1. Get venues in area from Google Places (reuse `PlacesSource` logic)
2. For each venue, resolve IG handle (2A)
3. Scrape posts (2B) — parallel with rate-limit guard (max 3 concurrent)
4. Parse captions (2C)
5. Normalize to `Event[]` with `source: 'instagram'`

Added to `eventSources` array in `src/lib/sources/index.ts`. Gated behind `INSTAGRAM_ENABLED=true` env var so it can be toggled without a deploy.

---

## Phase 3 — UI Polish

*Low priority. Collects known open items. No fixed order.*

| Item | File | Description |
|------|------|-------------|
| Drawer live count | `src/components/FilterDrawer.tsx` + `AppClient.tsx` | `previewCount` should reflect pending local state, not applied filters |
| Festival gate comment | `src/lib/vibeTags.ts` | Document why `FESTIVAL_RE` is gated on `types.size > 0` |
| Default branch in extractor | `src/lib/vibeTags.ts` | Add `default: break` with comment in `extractRuleTags` switch |
| Drawer entrance animation | `src/components/FilterDrawer.tsx` | Wire `animate-[slideUp_0.2s_ease-out]` already defined in `globals.css` |
| Other visual refinements | TBD | As identified during use |

---

## Phase 4 — Source City Coverage

*Medium priority. Existing sources are capped to specific cities — expand reach.*

### 4A · Audit current city caps

Per source (`residentadvisor`, `dice`, `eventbrite`, `ticketmaster`, `bandsintown`, `places`), document:
- Which cities/areas the source currently fetches
- Where the cap is enforced (hardcoded city list, geocode → area lookup, source-specific area IDs)
- Failure mode when query city is outside the cap (silent empty, error, fallback to nearest)

Output: short table in `docs/sources-coverage.md`.

### 4B · Expand RA area coverage

Resident Advisor uses area IDs (e.g. Milano = 13). Build a mapping `cityName → areaId` covering at least: Milano, Roma, Torino, Bologna, Firenze, Napoli, Padova, Verona, Genova, Bari. Fallback: nearest-area lookup based on lat/lng when city not in map.

### 4C · Expand other sources

For each source, lift any hardcoded single-city or small-region constraint:
- Use the `EventQuery` lat/lng/radiusKm if the source supports geo queries
- Otherwise build a city → source-id mapping for top-N Italian cities
- Document remaining gaps (sources that genuinely don't cover Italian nightlife outside major hubs)

### 4D · Instagram source coverage (ties into Phase 2)

When 2D lands, ensure venue list comes from Google Places for the requested city — not gated to a default city.

---

## Non-Goals

- Facebook Events (API requires business verification)
- TikTok (low event signal-to-noise for Italian nightlife)
- Instagram Stories (ephemeral, no API access)
- Analytics on search/filter usage (out of scope)
