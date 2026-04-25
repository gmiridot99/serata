# Serata — Execution Progress

> Aggiornato: 2026-04-25

## Stato generale

| Task | Descrizione | Stato |
|------|-------------|-------|
| 1 | Scaffold del progetto | ✅ Completato |
| 2 | Tipi condivisi e interfaccia EventSource | ✅ Completato |
| 3 | Eventbrite source | ✅ Completato |
| 4 | Route API eventi | ⏳ Non iniziato |
| 5 | Layout root e tema dark | ⏳ Non iniziato |
| 6 | Componente EventCard | ⏳ Non iniziato |
| 7 | Componente FilterBar | ⏳ Non iniziato |
| 8 | Componente CitySearch | ⏳ Non iniziato |
| 9 | Componente EventGrid | ⏳ Non iniziato |
| 10 | Componente EventMap (Leaflet) | ⏳ Non iniziato |
| 11 | Componente SplitView | ⏳ Non iniziato |
| 12 | Homepage | ⏳ Non iniziato |
| 13 | Pagina città | ⏳ Non iniziato |
| 14 | Pagina dettaglio evento | ⏳ Non iniziato |

---

## Dettaglio task completati

### Task 1 — Scaffold del progetto ✅

**Commit:** `feat: scaffold Next.js 15 project with Jest and Leaflet mock` + fix mock  
**File creati:**
- `package.json` — Next.js 16, leaflet, @testing-library/*, jest, @types/leaflet, @types/jest
- `jest.config.ts` — jsdom, setupFilesAfterEnv, moduleNameMapper leaflet→__mocks__
- `jest.setup.ts` — import @testing-library/jest-dom
- `__mocks__/leaflet.ts` — mock self-referential (map, tileLayer, circleMarker, latLngBounds)
- `.env.local.example` — EVENTBRITE_TOKEN=your_private_token_here
- `.gitignore` — aggiunto `!.env*.example`

**Note:** create-next-app ha installato Next.js 16.2.4 (non 15 come da piano, ma compatibile). Il mock Leaflet è stato fixato dopo la code review per rendere `setView` self-referential.

---

### Task 2 — Tipi condivisi ✅

**Commit:** `feat: add Event type and EventSource interface`  
**File creati:**
- `src/lib/types.ts` — EventCategory, EventPrice, Event, EventQuery, EventSource interface

---

### Task 3 — Eventbrite source ✅

**Commit:** `feat: add Eventbrite source with normalization and EventSource interface`  
**File creati:**
- `__tests__/lib/sources/eventbrite.test.ts` — 6 test TDD (tutti passano)
- `src/lib/sources/eventbrite.ts` — normalizeEvent + EventbriteSource (fetch, fetchById)
- `src/lib/sources/index.ts` — fetchEvents (Promise.allSettled), fetchEventById

**Test:** 6/6 ✅ | **TypeScript:** clean ✅  
**Note:** aggiunto @types/jest come devDependency (mancava per tsc --noEmit).

---

## Prossimi step

Riprendere dal **Task 4: Route API eventi** (`src/app/api/events/route.ts` e `src/app/api/events/[id]/route.ts`).
