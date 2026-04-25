# Serata — Design Spec

**Data:** 2026-04-25

## Obiettivo

Un sito web personale per scoprire eventi e serate nella propria zona: nightlife (club, bar, aperitivi) e cultura (concerti, teatro, mostre). L'utente inserisce una città e trova eventi aggregati da fonti esterne, visualizzati su griglia e mappa.

---

## Stack

| Livello | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Mappa | Leaflet + OpenStreetMap (gratuito, no API key) |
| Fonte eventi | Eventbrite API (estendibile) |
| Deploy | Vercel |

---

## Rotte

```
/                           Homepage — ricerca città + eventi in evidenza
/[city]                     Pagina città — griglia card + mappa split
/[city]/[id]                Dettaglio evento — hero, info, mappa locale, CTA biglietti
/api/events                 Route API proxy → Eventbrite (chiave server-side)
```

**Query params su `/api/events`:**
- `city` — nome città (es. `Milano`)
- `category` — `nightlife`, `music`, `arts`, `free` (multipli separati da virgola)
- `date` — `today`, `weekend`, o range ISO

---

## Architettura

```
Browser
  └── Next.js App (Vercel)
        ├── /app/page.tsx
        ├── /app/[city]/page.tsx
        ├── /app/[city]/[id]/page.tsx
        └── /app/api/events/route.ts
              └── EventSource interface
                    └── EventbriteSource   ← prima implementazione
                    └── (future: ScrapingSource, FacebookSource, ...)
```

La route API fa da proxy: riceve la richiesta dal frontend, chiama Eventbrite con la chiave segreta (mai esposta al browser), normalizza la risposta in un formato `Event` standard, e la ritorna. Aggiungere una nuova fonte significa implementare `EventSource` — il frontend non cambia.

### Tipo `Event` (formato normalizzato)

```ts
type Event = {
  id: string
  title: string
  description: string
  category: 'club' | 'concert' | 'aperitivo' | 'theatre' | 'other'
  date: string         // ISO 8601
  startTime: string    // "23:00"
  endTime?: string
  venue: {
    name: string
    address: string
    lat: number
    lng: number
  }
  price: { min: number; max: number; currency: string } | 'free'
  imageUrl?: string
  ticketUrl: string
  source: 'eventbrite' | 'scraping' | string
}
```

---

## UI & Design

**Tema:** dark, stile nightlife — sfondo `#0d0d1a`, accent `#e94560`, card `#1a1a2e`.

### Homepage (`/`)

- Header con nome app + tagline
- Barra di ricerca città con autocomplete
- Pill di filtro rapido: Stasera / Weekend / Gratis / Club / Concerti / Teatro / Aperitivo
- Sezione "In evidenza": griglia 2 colonne di card con foto (eventi nelle prossime 48h)

### Pagina città (`/[city]`)

**Desktop:** split view — lista card a sinistra (scrollabile), mappa Leaflet a destra (sticky).
**Mobile:** toggle tra vista griglia e mappa.

- FilterBar in cima (stesse pill dell'homepage)
- Contatore risultati ("24 eventi a Milano")
- Card eventi: immagine, badge categoria colorato, titolo, data/ora, prezzo
- Mappa: pin colorati per categoria. Click su pin → scroll alla card + highlight bordo. Hover sulla card → bounce del pin.

### Dettaglio evento (`/[city]/[id]`)

- Hero image full-width con overlay gradiente
- Badge categoria + breadcrumb "← Milano"
- Info box: data, orario, durata, venue, prezzo
- Descrizione completa
- Mini-mappa Leaflet con pin del locale
- CTA primaria: "Compra biglietti su Eventbrite →" (link esterno)
- URL condivisibile, Open Graph meta tags per preview sui social

---

## Componenti

| Componente | Responsabilità |
|---|---|
| `CitySearch` | Input città — MVP: campo libero con submit; in futuro autocomplete via Nominatim |
| `FilterBar` | Pill di filtro; stato attivo sincronizzato con query string |
| `EventCard` | Card con foto, badge, titolo, data, prezzo |
| `EventGrid` | Griglia responsiva di `EventCard` |
| `EventMap` | Leaflet map; riceve lista eventi, gestisce pin e interazioni |
| `SplitView` | Layout desktop: `EventGrid` + `EventMap` affiancati; mobile: toggle |
| `EventDetail` | Pagina dettaglio: hero, info box, mini-mappa, CTA |

---

## Gestione stato e fetch

- I filtri attivi vivono nella **query string** (`/milano?cat=club,free&date=today`) — URL condivisibile e navigazione back/forward funzionante.
- Il fetch eventi avviene server-side nelle page component (`fetch('/api/events?...')`) per avere SSR e nessun flash di caricamento.
- La mappa è client-only (Leaflet non supporta SSR) — lazy loaded con `dynamic(() => import('./EventMap'), { ssr: false })`.

---

## Espandibilità fonti

Quando si aggiunge una nuova fonte (es. scraping di un sito locale):

1. Creare `src/lib/sources/MyScraper.ts` che implementa `EventSource`
2. Registrarla in `src/lib/sources/index.ts`
3. La route API la chiama automaticamente e ne mergia i risultati

Nessuna modifica al frontend.

---

## Fuori scope (MVP)

- Account utente e preferiti
- Notifiche push
- Fonti oltre Eventbrite (Instagram, Facebook, scraping) — architettura pronta, non implementate
- Ricerca per geolocalizzazione automatica
- Internazionalizzazione
