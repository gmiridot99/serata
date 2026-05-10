# Sources coverage — IT focus

Aggiornato 2026-05-10 (post Phase 4B + RA filter syntax bugfix).

## Tabella per città

Numeri = eventi ritornati per `date=week` (campione live, non garantito stabile). 0 = source non copre la città. Source list eseguita in parallelo via `Promise.allSettled`.

| Città       | RA  | Dice | EB  | TM  | Note |
|-------------|-----|------|-----|-----|------|
| Milano      | 47  | 30   | 60  | 47  | hub IT principale |
| Roma        | 49  | 30   | 60  | 32  | Dice perm_name `roma` |
| Bologna     | 14  | 30   | 60  | 14  | Dice perm_name `bologna` |
| Firenze     | 10  | 0    | 60  | 10  | Dice non copre |
| Napoli      | 42  | 9    | 60  | 11  | Dice perm_name `Napoli` (case mixed) |
| Torino      | 24  | 0    | 60  | 10  | Dice non copre |
| Venezia     | 4   | 0    | 60  | 6   | Dice non copre |
| Como        | 47* | 0    | 60  | 6   | *RA fallback Milano (50km) |
| Bergamo     | ~50*| 0    | 60  | 2   | *RA fallback Milano (45km) |
| Aosta       | 24* | 0    | 60  | 1   | *RA fallback Torino (74km) |
| Norcia      | 0   | 0    | 60  | 0   | fuori cap RA 80km |
| Lecce       | 0   | 0    | 60  | 2   | fuori cap RA 80km |
| Cagliari    | 0   | 0    | ~55 | 0   | fuori cap RA 80km, no Dice |

\* = RA `nearest-area fallback` quando città utente non in mappa diretta.

## Source notes

### Resident Advisor (RA)
- GraphQL `ra.co/graphql`. Filter syntax CRITICO: `{areas: {eq: id}}`. Usare `{id: ...}` ritorna eventi globali non filtrati (cross-region pollution — bug fixed 2026-05-10).
- IT areas verificate via `areas(searchTerm: ...)` query: Milan 347, Rome 351, Turin 348, Venice 349, Bologna 350, Florence 352, Naples 406.
- IDs tipo 47/176/249 (legacy?) o non filtrano correttamente o puntano altre città.
- Cap nearest-area: 80km. Solo elettronica/club coverage.
- pageSize 50.

### Dice
- IT cities = solo 4 (api.dice.fm/cities, country_code=IT): `milano`, `roma`, `Napoli`, `bologna`. Niente Firenze/Torino/Venezia/Genova/Padova/Bari/Palermo/Catania.
- Aliases attivi solo per milano/roma/napoli (perm_name → IT-native).
- Slug = `${perm_name}-${id}`. buildId rotates → cache 1h.
- Concert + DJ + film + food.

### Eventbrite (EB)
- Coverage capillare ovunque. Place ID risolto da lat/lng (cache rounded coords).
- Limit 60 per query.
- Tutti i tipi.

### Ticketmaster (TM)
- API key required. Coverage globale.
- Concerti + sport + theatre principali.
- Capillare in nord IT, decrescente al sud.

### Bandsintown — disabled
- v4 location search richiede API key. Disabilitato.

### Instagram — gated
- Flag `INSTAGRAM_ENABLED=true`. Default off. Fragile (scraping senza headless).

## TODO future

- Sud Italia + isole (Bari, Palermo, Catania, Lecce, Cagliari): coverage solo EB. Cercare source IT-native (eventi.org? fanstop.it?).
- RA aree extra non in IT: per estero servirebbe AREAS extension (London, Berlin, Paris, NYC, Tokyo). Rinviato.
- Trento/Aosta/Norcia: cap 80km lascia province alpine/centro-IT senza RA. UX consider: badge "Eventi vicini (XXkm da Milano)" se cap salito.
