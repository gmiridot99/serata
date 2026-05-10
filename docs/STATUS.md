# Serata — Status

**Last updated:** 2026-05-10
**Branch:** `feat/llm-search`
**Last commit:** `257fe44` — feat: LLM search, IG source, city expansion, image fallback

---

## Done — sessione 2026-05-10

- **EventCard / EventDetailModal onError fallback** — `useState imgFailed` + `onError` su `next/image` → gradient div quando upstream 404 (es. RA asset cancellato)
- **FilterDrawer preview count** — `previewCount?: (pending) => number` prop, `AppClient` passa `filterEvents(events, pending, tagCache).length`. Bottone applica mostra "Mostra N risultati"
- **RA AREAS + nearest-area fallback** — coords pinned (Milano/Roma/Torino), haversine, cap 200km. Drop silent default-Milano
- **Dice CITY_ALIASES inverted** — chiave = perm_name canonical (turin/florence/venice/genoa/padua/naples/rome/milan), valori = aliases italiani. Bug fix: lookup precedente cercava `CITY_ALIASES[perm_name]` ma chiavi erano italiane → no-op tranne accidentali substring match
- **Phase 2 Instagram source** (gated `INSTAGRAM_ENABLED=true`):
  - `src/lib/resolveInstagramHandle.ts` — Google CSE + `unstable_cache` 7d
  - `src/lib/scrapeInstagramPosts.ts` — jitter 800-1600ms, regex JSON, fallback `[]` su 429/login wall
  - `src/lib/parseInstagramCaptions.ts` — DeepSeek `generateObject` + zod schema, skip senza data inferibile
  - `src/lib/sources/instagram.ts` — orchestratore: Places venues → handle → scrape → parse → normalize. Concurrency cap 3
  - Wired in `src/lib/sources/index.ts`. Default off

## Done — sessione 2026-05-09

- **Phase 1 LLM search** — `serializeEvents.ts`, `/api/search` (DeepSeek), `EventSearch.tsx`, `RecommendationsPanel.tsx`, wiring `AppClient.tsx`
- **Search bar UX** — badge "AI", submit button accent, w-full mobile / w-72 desktop, no iOS zoom
- **RA images doppio prefix** — `pickImageUrl` skip prefix se filename starts http. Host `images.ra.co`
- **Next/Image proxy** — `next.config.ts` `images.remotePatterns` whitelist (RA, dice, EB, TM, bandsintown, places)
- **Roadmap design doc** — `docs/superpowers/specs/2026-05-09-roadmap-design.md`
- **Phase 3 polish #2/#3/#4** — `FESTIVAL_RE` comment, `default: break`, slideUp animation wired

---

## TODO

### 1. Smoke test manuale (utente)

- [ ] EventCard: forza un evento con `imageUrl` 404 → verifica gradient fallback
- [ ] FilterDrawer: apri, modifica filtri senza Applica → verifica "Mostra N risultati" cambia live
- [ ] FilterDrawer: animazione slideUp mobile, slideRight desktop
- [ ] FilterDrawer: combinazioni filtri estremi (tutti chip selezionati)
- [ ] RA city = Bologna (44.5, 11.3) → eventi nearest-area Milano
- [ ] RA city + coords >200km da Milano/Roma/Torino → empty array, no eventi spurious
- [ ] Dice query "Firenze" / "Torino" → risultati via alias

### 2. Phase 2 Instagram — testing on

Per accendere:
- `INSTAGRAM_ENABLED=true`
- `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` (Google Programmable Search Engine)
- Riusa `GOOGLE_PLACES_API_KEY` + `DEEPSEEK_API_KEY`

Fragilità note:
- Scraping IG senza headless browser → 429 / login wall probabili in prod
- `extractCaptionsFromJson` regex fragili, IG ruota shape JSON spesso
- Fail mode: ogni handle → `[]`, no errore upstream

Soluzione robusta: Playwright server-side o IG Graph API business-verified (richiede review Meta).

### 3. Phase 4 city coverage residuo

- [ ] 4A: scrivere `docs/sources-coverage.md` (audit cap per source)
- [ ] 4B: aree RA extra (Bologna, Firenze, Napoli, Padova, Verona, Genova, Bari) — area IDs da verificare via GraphQL `areas` query (non disponibile da CLI senza session valido)
- [x] 4C: bandsintown disabilitato, places usa lat/lng OK
- [ ] 4D: Instagram source coverage (depends Phase 2)

### 4. Cleanup repo

- [ ] `.gitignore` aggiunge `.playwright-mcp/` + `*.png` (debug artifacts root)

---

## Env vars referenziate

```
DEEPSEEK_API_KEY            # required for /api/search + /api/enrich-tags + IG caption parse
GOOGLE_PLACES_API_KEY       # places venues + IG source venue lookup
TICKETMASTER_API_KEY        # TM events
GOOGLE_CSE_KEY              # IG handle resolver (Phase 2)
GOOGLE_CSE_CX               # IG handle resolver (Phase 2)
INSTAGRAM_ENABLED=true      # gate IG source (default off)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # client maps
```
