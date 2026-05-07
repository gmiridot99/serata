# Roadmap — 3. serata

## Contesto
App di aggregazione vita notturna/eventi. Stack: Next.js App Router, no DB (pure API aggregation).
Sorgenti attive: Ticketmaster + Google Places.
Sorgenti codificate ma non connesse: Eventbrite (`src/lib/sources/eventbrite.ts`).

---

## Step 1 — Wire Eventbrite (10 min)
**File:** `src/lib/sources/index.ts`

```ts
import { EventbriteSource } from './eventbrite';
// aggiungere all'array eventSources:
new EventbriteSource(process.env.EVENTBRITE_PRIVATE_TOKEN ?? ''),
```

- Aggiungere `EVENTBRITE_PRIVATE_TOKEN=...` a `.env.local`
- Verificare gestione ID prefix in `fetchById()`
- **Auth**: serve solo Private Token (Bearer) — NON OAuth. Registrarsi su eventbrite.com/platform

---

## Step 2 — Deduplicazione cross-source (30 min)
**File nuovo:** `src/lib/dedup.ts`

Logica: raggruppa eventi per `(titolo normalizzato + data + venue)`, tieni il primo, scarta duplicati.
Chiamare in `src/lib/sources/index.ts` dopo `Promise.allSettled`.

---

## Step 3 — Adapter Bandsintown (1h)
**File nuovo:** `src/lib/sources/bandsintown.ts`

- API pubblica gratis, focus artisti/concerti
- Docs: https://manager.bandsintown.com/support/bandsintown-api
- Aggiungere a `eventSources` in `index.ts`

---

## Step 4 — Adapter Resident Advisor (2h)
**File nuovo:** `src/lib/sources/residentadvisor.ts`

- GraphQL non-ufficiale: `https://ra.co/graphql`
- Apify actor disponibile: `apify.com/augeas/resident-advisor`
- Focus: musica elettronica/techno — gap critico per nightlife ITA
- Aggiungere a `eventSources` in `index.ts`

---

## Step 5 — Test copertura (manuale)
- Testare ricerca in Milano, Roma, Torino
- Verificare eventi con `source: "eventbrite"`, `source: "bandsintown"`, `source: "ra"`
- Verificare assenza duplicati

---

## Step 6 — AI Query Parser (mezza giornata)
**File nuovo:** `src/lib/parseQuery.ts`

- Modello: **Claude Haiku 4.5** via Vercel AI Gateway
- Input: stringa NL utente (es. "posto romantico tranquillo vicino navigli")
- Output: `{ category[], vibe[], location, date, priceRange, keywords }`
- Costo: ~$0.0002/query — trascurabile
- Passare output come params alle sorgenti esistenti

---

## Step 7 — Review Enrichment batch (1-2 giorni)
**File nuovo:** `src/lib/enrichVenues.ts`

- Per ogni venue Google Places → invia recensioni a **Claude Sonnet 4.6**
- Prompt → JSON tags: `{ vibe[], noise_level, age_range, best_for[], summary_it }`
- Cache: Vercel KV o file JSON in `/data/venues-enriched/`
- Aggiungere filtri UI basati su tag

---

## Step 8 — Filtri eventi avanzati (brainstorm pendente)
**Stato attuali**: data, categoria (concert/club/theatre/aperitivo/other), località, raggio.
**Idee da brainstormare**:
- Restringere risultati: prezzo (free/range), fascia oraria, distanza fine
- Intento/vibe: genere musicale, indoor/outdoor, sold-out hide, fascia età
- Contesto sociale: solo/coppia/gruppo, kid-friendly, lingua evento
- Filtri locali: categoria (bar/ristorante/club), open now, fascia prezzo €/€€/€€€
- Decidere: pannello completo vs chip incrementali vs slide-over

---

## Step 9 — Espansione città (brainstorm pendente)
**Stato attuale**: DICE risolve qualsiasi città via `/cities` API; Eventbrite via `place_from_coordinates` (lat/lng arbitrari) → copertura tecnica già globale.
**Bottleneck reale**: UX — `LocationOverlay` non suggerisce città oltre input testuale.
**Idee**:
- Lista città preset ITA (Milano/Roma/Torino/Bologna/Napoli/Firenze) come quick-pick
- Autocomplete cities da DICE `/cities` API (cached 24h)
- Geocoding inverso per "città vicine" entro N km
- Estendere CITY_ALIASES dice.ts (Firenze/Bologna/Verona localized)
- Verificare coverage Eventbrite/RA su città medie ITA

---

## Note architettura
- **No vector DB / pgvector** — dati già strutturati, embeddings = spreco
- **No Songkick** — richiede partnership a pagamento
- **No DICE API** — solo per partner ticketing (venditori)
- **No scraping IG/FB** — fragile + ToS
- Supabase solo se serve dedup persistente o cache cross-region (futuro)
