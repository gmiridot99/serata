# Serata — Single-Page Redesign

**Date:** 2026-04-26  
**Status:** Approved

---

## Context

The current app has two separate pages: a homepage (`/`) with a city search form and a featured section, and a results page (`/[city]`) with a split map+list view. The featured section is empty because: Eventbrite's public search API is deprecated (returns 404), MockSource has no events for "today", and Ticketmaster rarely has events exactly today. The city results page has no way to change city without going back to the homepage. Event cards are not clickable. The place detail page at `/[city]/[id]` exists but is unreachable.

This redesign consolidates everything into a single page with geolocation, an always-visible map+list layout, and a modal for event/place detail.

---

## Goals

- Single URL (`/`), no page navigation for city changes or detail views
- Geolocation on load → auto-fetch events for user's city
- Always-visible split layout (map + list)
- Modal/bottom-sheet for event and place detail (with photos)
- City change via top search bar, updates results in-place
- Remove broken Eventbrite source

---

## Architecture

### Routes (after redesign)

| Route | Role |
|---|---|
| `/` | Single entry point — full client-side app |
| `/api/events` | Existing API route, accepts `city`, `date`, `free`, `q` as query params |
| `/api/geocode` | **New** — reverse geocodes `lat`+`lng` to city name via Google Geocoding API |

**Removed:** `/[city]/page.tsx`, `/[city]/[id]/page.tsx`, `/[city]/` directory entirely.

### URL state (silent)

State is reflected in the URL via `router.replace` (no navigation, no scroll reset):
```
/?city=Milano&date=today&free=true&q=cocktail
```
Modal state is **not** in the URL — kept in React only.

---

## State (`useAppState` hook)

```ts
city: string | null           // current city name
events: Event[]               // fetched results
filters: {
  date?: 'today' | 'weekend'
  free: boolean
  q?: string
}
loading: boolean
geoStatus: 'pending' | 'granted' | 'denied'
selectedEvent: Event | null   // drives modal open/close
highlightedId: string | null  // card↔pin hover sync
```

All fetch logic lives in `useAppState`. Components only receive state and callbacks as props.

---

## Load Flow

```
1. Mount → navigator.geolocation.getCurrentPosition()
   ├─ granted → GET /api/geocode?lat=...&lng=...
   │            → { city: "Milano" }
   │            → setCity("Milano") → fetch events
   └─ denied/timeout → geoStatus = 'denied'
                      → show EmptyState ("Cerca una città per iniziare")

2. User types in CitySearchBar
   → debounce 500ms → Google Places Autocomplete (cities only)
   → user selects suggestion → setCity(...) → fetch events
   → router.replace('/?city=...')

3. Filter change (date, free, keyword)
   → setFilters(...) → fetch events with new params
   → router.replace with updated params
```

---

## Components

### New

| Component | Description |
|---|---|
| `AppClient` | Root client component. Instantiates `useAppState`, composes all children. Replaces `CityPageClient`. |
| `CitySearchBar` | Top search bar with 500ms debounce and Google Places Autocomplete (type: `(cities)`) for city suggestions. Replaces `CitySearch` + `CitySearchWrapper`. |
| `EventDetailModal` | Slide-over (desktop, 400px from right) / bottom sheet (mobile, ~85vh). See Modal section. |
| `EmptyState` | Shown when `geoStatus === 'denied'` and no city is set. Full-height centered message with CitySearchBar highlighted. |
| `/api/geocode` | Route handler: accepts `lat`, `lng`. Calls Google Geocoding API with `GOOGLE_PLACES_API_KEY`. Returns `{ city: string }`. Falls back to null on error. |

### Modified

| Component | Change |
|---|---|
| `app/page.tsx` | Becomes minimal server shell, renders only `<AppClient />` |
| `EventCard` | Adds `onClick` prop → calls `onSelect(event)`. Removes `<Link>`. |
| `EventMap` | Pin click → calls `onSelect(event)` (opens modal) instead of just `onPinClick(id)` (highlight only). Highlight-on-hover behavior preserved. |
| `SplitView` | Receives `onSelect` callback, passes to both `EventGrid` and `EventMap`. |
| `lib/sources/index.ts` | Removes `EventbriteSource` from `eventSources` array. |

### Removed

- `CitySearch.tsx`
- `CitySearchWrapper.tsx`
- `app/[city]/page.tsx`
- `app/[city]/[id]/page.tsx`

---

## Layout

### Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  🔮 Serata    [Milano                    🔍]  [Oggi][Fine]  │  ← fixed header
│               [🔎 cerca tipo locale...]                     │  ← keyword search
│  12 eventi a Milano                                         │  ← results count
├──────────────────────────┬──────────────────────────────────┤
│  Lista (scroll)          │  Mappa (sticky, full height)     │
│  [card]                  │                                  │
│  [card]                  │    📍 📍                        │
│  [card]                  │          📍                     │
│  ...                     │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

When modal is open, it overlays the map (right half) on desktop — the list remains fully visible and scrollable. The map is covered by the modal, which is acceptable since the selected pin is already the focus.

### Mobile

Header + keyword search + Lista/Mappa toggle (existing pattern). Modal appears as bottom sheet sliding up.

---

## EventDetailModal

**Triggers:**
- Click on a card in the list
- Click on a map pin

**Content:**

```
[hero image — venue photo (Places) or event promo (Ticketmaster)]  [✕]
[category badge]
[title]

📅 [formatted date]
🕐 [time range]
📍 [venue name], [address]
💰 [price]

[mini-map of venue]

[CTA button]
```

**CTA button:**
- Ticketmaster events → "Compra biglietti →" (links to `ticketUrl`)
- Places results → "Apri in Google Maps →" (links to `googleMapsUri`)

**Photos:**
- Places: Google Places Photos API — URL already built by `PlacesSource.normalizePlaceToEvent()` as `imageUrl`
- Ticketmaster: largest image from `images[]`, already mapped as `imageUrl`
- Fallback: dark gradient with category badge

**Close:** click backdrop, press ESC, swipe down (mobile), X button.

**Desktop animation:** slide in from right (CSS `transform: translateX`).  
**Mobile animation:** slide up from bottom (`transform: translateY`).

---

## Error Handling

| Situation | UI |
|---|---|
| Geolocation pending | Spinner on map, no list content |
| Geolocation denied, no city | `EmptyState` component with search bar |
| Geocode API fails | Fall through to `EmptyState` |
| Events fetch fails | Toast error, empty list, map centers on Italy |
| Events fetch returns 0 results | "Nessun evento trovato a [città] — prova a cambiare data o filtri" |
| Image fails to load in modal | Gradient fallback |

---

## API Changes

### Remove Eventbrite

In `lib/sources/index.ts`, remove `EventbriteSource` from `eventSources`:

```ts
// Before
const eventSources = [new MockSource(), new TicketmasterSource(...), new EventbriteSource(...)]

// After
const eventSources = [new MockSource(), new TicketmasterSource(...)]
```

Eventbrite's `/v3/events/search/` endpoint returns 404 — the public search API has been deprecated.

### New: `/api/geocode`

```ts
// GET /api/geocode?lat=45.46&lng=9.18
// Response: { city: "Milano" } | { city: null }
```

Uses `GOOGLE_PLACES_API_KEY` server-side. Calls:
```
https://maps.googleapis.com/maps/api/geocode/json
  ?latlng={lat},{lng}
  &result_type=locality
  &key={GOOGLE_PLACES_API_KEY}
```

Extracts `long_name` from the `locality` component of the first result.

---

## What Is Not Changing

- `FilterBar` — unchanged
- `KeywordSearch` — unchanged (already has 500ms debounce)
- `EventMap` internals (pin colors, dark style, hover scale) — unchanged
- `PlacesSource` — unchanged
- `TicketmasterSource` — unchanged
- `MockSource` — unchanged
- `lib/types.ts` — unchanged
- All existing tests — updated only for removed/renamed components
