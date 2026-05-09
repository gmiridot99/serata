# Event Vibe Filters — Design

**Date**: 2026-05-09
**Status**: Spec — pending implementation
**Scope**: Step 8 (TODO.md) — filtri eventi avanzati

## Goal

Aggiungere 3 filtri "vibe" alla sezione eventi:

1. **Fascia oraria** (timeOfDay) — pomeriggio / aperitivo / cena / tarda sera
2. **Tipo serata** (eventType) — live / DJ / festival / open-mic / silent-disco (multi-select)
3. **Indoor / outdoor** (setting) — single-select con opzione "qualsiasi"

UI: fascia oraria inline nell'header (sempre visibile); tipo serata + setting in un drawer slide-over (desktop) / bottom sheet (mobile) dietro un bottone "⚙ Filtri".

Data: filtri client-side su eventi già fetchati. Tag generati con regole + LLM lazy on-demand (Sonnet 4.6 via Vercel AI Gateway). Cache in-memory phase 1, swappabile a Vercel Runtime Cache o DB futuro.

## Architecture

### Nuove unità

```
src/lib/
  vibeTags.ts          tipi + extractRuleTags(event) → VibeTags parziale
  enrichTags.ts        batch LLM caller (Claude Sonnet 4.6 via AI SDK)
  tagCache.ts          Map<eventId, VibeTags> + interface seam (get/set/getMany)
  filterEvents.ts      pure (events, filters, cache) → events

src/components/
  FilterDrawer.tsx     slide-over (desktop) / bottom sheet (mobile)
  TimeOfDayChips.tsx   inline chip row (multi-select)
  VibeFilterChips.tsx  multi/single chip groups inside drawer
```

### Estensioni

- `src/lib/types.ts`: aggiunge `TimeOfDay`, `EventType`, `Setting`, `VibeTags`; estende `EventFilters`.
- `src/components/AppClient.tsx`: render `TimeOfDayChips` inline + button trigger drawer.
- `src/hooks/useAppState.ts`: state per nuovi filter fields, persist in URL searchParams.
- Nuovo hook `useFilteredEvents(events, filters)` → `{ events, enriching }`.

### Data flow

```
fetchEvents() → events[]                     (no change)
        ↓
useFilteredEvents(events, filters):
  1. derive timeOfDay da event.startTime (puro, sempre)
  2. extractRuleTags(event) per ogni event (sync, sempre)
  3. merge in tagCache
  4. se filter.eventType o filter.setting attivo:
       missing = events senza setting/eventType in cache
       if missing.length > 0 → enrichTags(missing) async
       update cache, set enriching=true durante call
  5. filterEvents(events, filters, cache) → visibleEvents
```

## Types

```ts
export type TimeOfDay = 'afternoon' | 'aperitivo' | 'dinner' | 'late'
// afternoon: startHour < 18
// aperitivo: 18 <= startHour < 21
// dinner:    21 <= startHour < 23
// late:      startHour >= 23 (incluso early morning 0-5)

export type EventType =
  | 'live'         // concerto live band
  | 'dj'           // DJ set / club night
  | 'festival'
  | 'open-mic'
  | 'silent-disco'

export type Setting = 'indoor' | 'outdoor'

export interface VibeTags {
  eventType?: EventType[]
  setting?: Setting
}

export interface EventFilters {
  // existing
  mode: 'events' | 'venues'
  date?: string
  category?: EventCategory[]
  radiusKm?: number
  q?: string
  // new
  timeOfDay?: TimeOfDay[]
  eventType?: EventType[]
  setting?: Setting
}
```

## Rule-based tag extraction

`vibeTags.ts:extractRuleTags(event: Event): VibeTags`

| Source field | → eventType |
|---|---|
| `event.source === 'dice'` con tag `music:dj` | `['dj']` |
| `event.source === 'dice'` con tag `music:gig` | `['live']` |
| `event.source === 'ticketmaster'` segment Music + subgenre regex `/dj/i` | `['dj']` |
| `event.source === 'ticketmaster'` segment Music (default) | `['live']` |
| `event.source === 'ra'` (sempre) | `['dj']` |
| Title regex `/festival/i` | aggiunge `festival` |
| Title regex `/silent disco/i` | `['silent-disco']` |
| Title regex `/open mic\|jam session/i` | `['open-mic']` |

Setting: nessuna rule affidabile da source data → sempre LLM.

Note: i tag DICE/TM sono passati attraverso `Event` come è oggi — gli adapter espongono già `category` ma non i tag raw. Estensione minima: aggiungere `Event.sourceTags?: string[]` opzionale, popolato da DICE/TM adapter, usato solo da `extractRuleTags`. Non rompe l'interfaccia esistente.

## LLM enrichment

`enrichTags.ts:enrichTags(events: Event[]): Promise<Map<string, VibeTags>>`

- **Provider**: DeepSeek direct API via `@ai-sdk/deepseek`, model `deepseek('deepseek-chat')` (DeepSeek V3). API key from `DEEPSEEK_API_KEY` env var.
- **Tool**: AI SDK `generateObject` con zod schema strutturato.
- **Batch**: 50 eventi/call. Se input > 50, split in batch sequenziali.
- **Timeout**: 10s per call, abort signal.
- **Input per evento**: `{ id, title, venueName, descSnippet: description.slice(0, 200) }`.
- **Output schema**:
  ```ts
  z.object({
    tags: z.array(z.object({
      id: z.string(),
      eventType: z.array(z.enum(['live','dj','festival','open-mic','silent-disco'])).optional(),
      setting: z.enum(['indoor','outdoor']).optional(),
    }))
  })
  ```
- **System prompt**: "Sei un classificatore di eventi nightlife. Rispondi solo con JSON valido secondo lo schema. Lascia campi `undefined` se non determinabile dalle informazioni fornite."
- **Cost stima**: 60 eventi → 1 call ≈ $0.005. Trascurabile.

### Concurrency

`useFilteredEvents` debounce 300ms su filter changes prima di triggerare `enrichTags`. In-flight Set di eventIds previene call duplicate per stessi events.

## Cache (phase 1)

`tagCache.ts`:

```ts
interface TagCache {
  get(eventId: string): VibeTags | undefined
  getMany(eventIds: string[]): Map<string, VibeTags>
  set(eventId: string, tags: VibeTags): void
  setMany(entries: Map<string, VibeTags>): void
}

// implementation: in-memory Map module-scope
```

Phase 1: Map persiste vita pagina. Reload = clear. No TTL.

Future swap: stessa interface, implementazione Vercel Runtime Cache (TTL 7d) o Supabase tabella `event_tags`.

## UI components

### TimeOfDayChips (inline)

- Posizione: dopo `CategoryChips` in header desktop, in seconda riga header mobile.
- Multi-select chips con icone:
  - `🌅 Pomeriggio` (afternoon)
  - `🍹 Aperitivo`
  - `🍽 Cena` (dinner)
  - `🌃 Tarda sera` (late)
- Stile: identico a `CategoryChips` (riuso pattern + classi).
- Mobile: scroll orizzontale se overflow.

### FilterDrawer trigger

Bottone `⚙ Filtri` con badge count attivi (es. `⚙ Filtri (2)`). Posizione: dopo `TimeOfDayChips`, prima dello spacer count eventi.

### FilterDrawer

- Desktop: slide-over right, 320px width, full height, backdrop semi-trasparente.
- Mobile: bottom sheet, full width, 70vh, dismiss swipe-down + tap backdrop.
- Pattern stilistico: riusa `LocationOverlay`.

Contenuto:

```
Filtri avanzati                     [X]

Tipo serata                  [reset]
☐ 🎤 Live   ☐ 🎧 DJ   ☐ 🎪 Festival
☐ 🎙 Open mic   ☐ 🤫 Silent disco

Ambiente                     [reset]
○ Qualsiasi   ○ 🏠 Indoor   ○ 🌳 Outdoor

────────────────────────────────────
[Pulisci tutto]    [Applica (24)]
```

- Drawer mantiene **stato locale** (selezione chip) finché aperto. Filtri applicati al risultato visibile solo on click "Applica" (dismiss drawer + commit a `filters`).
- "Applica (N)" mostra count preview calcolato sullo stato locale del drawer (filterEvents simulato, no enrichment ri-triggerato).
- Footer sticky, content scrollable.
- Loading state durante enrichment: spinner overlay + chip disabilitati.
- "Pulisci tutto" reset SOLO eventType + setting nello stato locale drawer (timeOfDay è inline, persiste).
- Tap backdrop o swipe-down dismiss = scarta selezione locale, no commit.

## Error handling

| Failure | Behavior |
|---|---|
| LLM timeout (>10s) | Abort, log `[vibeTags]`, untagged stay untagged. Filter drop untagged. Se risultato visibile == 0 e filter LLM-dependent attivo, banner "Nessun risultato — riprova" con retry button. |
| LLM API error (rate limit/5xx) | Fallback come timeout + toast "Filtro AI temporaneamente non disponibile". |
| LLM JSON malformed | Catch zod parse error, log, treat as empty result. |
| `DEEPSEEK_API_KEY` missing | Drawer button disabilitato + tooltip "Filtri AI non configurati". TimeOfDayChips funzionano comunque (nessuna LLM dependency). |
| Network offline | Standard fetch error, drawer reset, toast. |

Filtro `timeOfDay` mai dipende da LLM → resta operativo in qualsiasi failure mode.

## Testing

### Unit

- `filterEvents.ts` (pure): fixture eventi → buckets timeOfDay corretti, eventType intersection multi-select, setting drop untagged se filter attivo.
- `vibeTags.ts:extractRuleTags`: fixture per source (DICE/TM/RA/EB) → mapping atteso.
- `enrichTags.ts`: mock AI SDK `generateObject`. Test batch split (>50), JSON malformed fallback, timeout abort.

### Component

- `FilterDrawer`: render, click chip toggles state locale, "Applica" calls `onChange` con filters merged.
- `TimeOfDayChips`: multi-select toggle, "all selected" state visivo.

### Integration

- `useFilteredEvents`: filter activation triggers `enrichTags` 1x; seconda activation stessi events hits cache (no re-call); cache miss parziale chiama solo events mancanti.

### Manual

- Live data Milano, sample 20 eventi: verifica accuracy LLM tag (eyeball check). Soglia accettabile soggettiva — non ci aspettiamo 100%.

### Test stack

Verifica in plan se Vitest/Jest già configurato. Se assente, setup parte del plan.

## Out of scope (future)

- Cache persistente (Vercel Runtime Cache o Supabase)
- Genere musicale, fascia età, lingua evento
- Analytics filtri usati
- Indoor/outdoor inference rule-based (es. lookup venue type da Google Places)
- Filtri locali (Step 8 menziona anche locali — separato spec)

## Open questions

Nessuna.
