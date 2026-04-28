# Serata — Redesign Handoff v1
> Tema: **Notte** · Font: Syne (headings/logo/orari) + DM Sans (UI)
> Priorità: desktop first. Mobile segue stessa logica con bottom nav.

---

## 1. Design Tokens → `globals.css`

Vedi `globals.css` aggiornato nella stessa cartella. I token cambiano nome:

| Token vecchio | Token nuovo | Valore |
|---|---|---|
| `--bg` | `--bg` | `#080807` |
| `--bg-card` | `--card` | `#111110` |
| *(nuovo)* | `--elev` | `#1a1917` |
| *(nuovo)* | `--elev2` | `#222018` |
| `--text` | `--text` | `#f0e8d5` |
| `--text-muted` | `--muted` | `#5c564e` |
| *(nuovo)* | `--bright` | `#9a8e80` |
| `--accent` | `--accent` | `#f0a020` |
| *(nuovo)* | `--accent-lo` | `rgba(240,160,32,0.10)` |
| *(nuovo)* | `--border` | `rgba(240,232,213,0.07)` |
| *(nuovo)* | `--border-md` | `rgba(240,232,213,0.13)` |

Font stack nel body: `'DM Sans', sans-serif`
Font Syne: usato solo su `.font-display` (wordmark, orari grandi, titoli evento)

---

## 2. Architettura UX

### Desktop (priorità)
```
┌─────────────────────────────────────────────────────────┐
│ HEADER (56px, 1 riga)                                   │
│  serata  [Navigli, Milano ›]  eventi·locali  stasera lun mar…  [Club][Concerto]…  [filtri]  12 risultati │
├────────────────────────┬────────────────────────────────┤
│ LISTA (420px, scroll)  │ MAPPA (flex-1)                 │
│  featured card         │  Google Map                    │
│  ─────────────────     │  pin prezzo per ogni evento    │
│  row · row · row       │  pill "12 eventi" in alto      │
│  row · row · row       │                                │
└────────────────────────┴────────────────────────────────┘
```

### Mobile
```
┌─────────────────────┐
│ HEADER (2 righe)    │
│  serata  [Milano ›] │
│  stasera lun mar…   │ ← DateTabs underline
│  [Club][Concerto]…  │ ← CategoryChips
├─────────────────────┤
│ CONTENUTO           │
│  featured card      │
│  rows list          │
├─────────────────────┤
│ BOTTOM NAV          │
│  eventi  mappa locali│
└─────────────────────┘
```

---

## 3. Componenti da modificare

### 3.1 `globals.css`
→ Sostituire con il file allegato. Aggiunge `@font-face` Syne via Google Fonts.

---

### 3.2 `AppClient.tsx` — refactor header

**Desktop header (1 riga, `hidden md:flex`):**
```tsx
<header className="h-14 flex items-center gap-0 px-7 border-b border-border shrink-0 bg-bg">
  {/* Wordmark */}
  <span className="font-display font-black text-xl text-accent tracking-tight mr-6 shrink-0">serata</span>

  {/* Location chip */}
  <LocationChip location={location} onClick={() => setLocationOpen(true)} />

  {/* Mode toggle — pill sottile */}
  <ModeToggle mode={filters.mode} onChange={...} className="mx-4 shrink-0" />

  {/* Divider */}
  <div className="w-px h-5 bg-border mx-3 shrink-0" />

  {/* Date tabs underline */}
  <DateTabs value={filters.date} onChange={...} />

  {/* Divider */}
  <div className="w-px h-5 bg-border mx-3 shrink-0" />

  {/* Category chips */}
  <CategoryChips value={filters.category} onChange={...} />

  {/* Spacer */}
  <div className="flex-1" />

  {/* Filtri button */}
  <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />

  {/* Result count */}
  <span className="text-xs text-muted ml-4 shrink-0 tabular-nums">
    {events.length} {isVenueMode ? 'locali' : 'eventi'}
  </span>
</header>
```

**Mobile header (`flex md:hidden`, 2 righe):**
```tsx
<header className="shrink-0 bg-bg border-b border-border z-30">
  {/* Row 1 */}
  <div className="flex items-center justify-between px-4 py-3">
    <span className="font-display font-black text-xl text-accent tracking-tight">serata</span>
    <LocationChip location={location} onClick={() => setLocationOpen(true)} />
  </div>
  {/* Row 2: date tabs */}
  <DateTabs value={filters.date} onChange={...} className="px-4" />
  {/* Row 3: category chips + filtri */}
  <div className="flex items-center gap-2 px-4 pb-3 pt-1">
    <CategoryChips value={filters.category} onChange={...} />
    <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
  </div>
</header>
```

**Nuovo stato locale in `AppClient`:**
```tsx
const [locationOpen, setLocationOpen] = useState(false)
const [filterOpen, setFilterOpen]     = useState(false)

// Apri location overlay automaticamente se nessuna location
useEffect(() => {
  if (geoStatus === 'denied' && !location) setLocationOpen(true)
}, [geoStatus, location])
```

**Rimossi dall'`AppClient`:** `<ModeTab>`, `<RadiusSelector>`, `<EmptyState>` (sostituito da `<LocationOverlay>`)

---

### 3.3 `ModeTab.tsx` → `ModeToggle.tsx` (rinomina + restyle)

Rimosso dal header. Su desktop rimane nel header come pill compatto.
Su mobile scompare dall'header → va nel `BottomNav`.

```tsx
// ModeToggle.tsx — pill sottile, no emoji
<div className="flex bg-elev rounded-full p-0.5 gap-0.5">
  <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors
    ${mode === 'events' ? 'bg-accent text-bg' : 'text-muted hover:text-text'}`}>
    eventi
  </button>
  <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors
    ${mode === 'venues' ? 'bg-accent text-bg' : 'text-muted hover:text-text'}`}>
    locali
  </button>
</div>
```

> ⚠️ Niente emoji. Tutto lowercase.

---

### 3.4 `DateScroll.tsx` → `DateTabs.tsx` (restyle)

Stessa logica, cambio visual: da pill con background a **underline tab**.

```tsx
// DateTabs.tsx
<div className="flex overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden">
  {pills.map(pill => (
    <button
      key={pill.value}
      onClick={() => onChange(active === pill.value ? undefined : pill.value)}
      className={`shrink-0 flex flex-col items-center px-3.5 py-2 pb-2.5 border-b-2 -mb-px
        text-xs font-medium transition-colors
        ${active === pill.value
          ? 'border-accent text-accent'
          : 'border-transparent text-muted hover:text-bright'
        }`}
    >
      <span className="font-semibold lowercase">{pill.label}</span>
      {pill.sublabel && <span className="opacity-60 text-[10px]">{pill.sublabel}</span>}
    </button>
  ))}
  {/* "gratis" come ultima tab */}
  <button className={`shrink-0 px-3.5 py-2 pb-2.5 border-b-2 -mb-px text-xs font-medium
    transition-colors ${free ? 'border-accent text-accent' : 'border-transparent text-muted'}`}
    onClick={() => setFilters({ ...filters, free: !filters.free })}>
    gratis
  </button>
</div>
```

---

### 3.5 Nuovo `CategoryChips.tsx`

Nuovo componente. Filtra per categoria (multi-select, già supportato da `EventQuery`).

```tsx
// CategoryChips.tsx
const CATS = [
  { key: 'club',      label: 'Club',      color: '#8b5cf6' },
  { key: 'concert',   label: 'Concerto',  color: '#3b82f6' },
  { key: 'aperitivo', label: 'Aperitivo', color: '#f97316' },
  { key: 'theatre',   label: 'Teatro',    color: '#10b981' },
]

export default function CategoryChips({ value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {CATS.map(cat => {
        const active = value?.includes(cat.key)
        return (
          <button key={cat.key} onClick={() => toggle(cat.key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full
              border text-[11px] font-medium transition-all"
            style={{
              borderColor:  active ? cat.color + '80' : 'var(--border)',
              background:   active ? cat.color + '18' : 'transparent',
              color:        active ? cat.color : 'var(--bright)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: cat.color }} />
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
```

**Nota:** aggiungere `category?: EventCategory | EventCategory[]` a `Filters` in `useAppState.ts` e passarlo alla query API.

---

### 3.6 Nuovo `LocationChip.tsx`

Sostituisce il vecchio `<LocationSearch>` nell'header. È un bottone che apre `<LocationOverlay>`.

```tsx
// LocationChip.tsx
export default function LocationChip({ location, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
        border border-border-md bg-transparent text-sm font-medium
        text-text hover:border-border-md transition-colors">
      <PinIcon className="w-3.5 h-3.5 text-accent shrink-0" />
      <span>{location?.name ?? 'Scegli città'}</span>
      <ChevronIcon className="w-3 h-3 text-muted" />
    </button>
  )
}
```

---

### 3.7 Nuovo `LocationOverlay.tsx`

Overlay fullscreen che avvolge il vecchio `<LocationSearch>` (Google Autocomplete).
Si apre: (a) tap su `<LocationChip>`, (b) automaticamente se `geoStatus === 'denied' && !location`.

```tsx
// LocationOverlay.tsx
export default function LocationOverlay({ open, onClose, onSelect }) {
  if (!open) return null
  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      {/* panel */}
      <div className="fixed inset-x-0 top-0 z-50 bg-bg border-b border-border
        md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-10
        md:w-[480px] md:rounded-2xl md:border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-black text-lg text-accent">serata</span>
            <button onClick={onClose} className="text-muted hover:text-text">✕</button>
          </div>
          {/* riutilizza LocationSearch esistente */}
          <LocationSearch value={null} onLocationSelect={(loc) => { onSelect(loc); onClose() }} />
          {/* shortcut città */}
          <div className="flex flex-wrap gap-2 mt-4">
            {['Milano','Roma','Torino','Bologna','Firenze','Napoli'].map(city => (
              <button key={city}
                className="px-4 py-2 rounded-xl bg-elev border border-border
                  text-sm text-text hover:border-border-md transition-colors"
                onClick={() => { onSelect({ name: city, lat: 0, lng: 0 }); onClose() }}>
                {city}
              </button>
            ))}
          </div>
          {/* usa posizione */}
          <button className="mt-3 w-full flex items-center gap-3 p-3 rounded-xl
            bg-elev border border-border hover:border-border-md transition-colors">
            <div className="w-8 h-8 rounded-lg bg-accent-lo flex items-center justify-center shrink-0">
              <PinIcon className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text">Usa la mia posizione</p>
              <p className="text-xs text-muted">Trova eventi nelle vicinanze</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
```

---

### 3.8 Nuovo `FilterSheet.tsx`

Bottom sheet (mobile) / popover (desktop) con: radius + categoria + prezzo.
Si apre dal `<FilterButton>` nell'header.

```tsx
// FilterSheet.tsx
export default function FilterSheet({ open, onClose, filters, onChange }) {
  if (!open) return null
  const radii = [5, 10, 25, 50]
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      {/* Mobile: bottom sheet. Desktop: dropdown sotto il bottone */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-bg rounded-t-2xl border-t border-border
        animate-slide-up p-6 space-y-6
        md:fixed md:bottom-auto md:inset-x-auto md:right-6 md:top-16
        md:w-72 md:rounded-2xl md:border md:animate-none md:shadow-2xl">

        {/* header sheet */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text">Filtri</span>
          <button onClick={onClose} className="text-muted hover:text-text text-sm">✕</button>
        </div>

        {/* Distanza */}
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Distanza</p>
          <div className="flex gap-2">
            {radii.map(km => (
              <button key={km}
                onClick={() => onChange({ ...filters, radiusKm: km })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
                  ${filters.radiusKm === km
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-transparent text-muted border-border hover:border-border-md'
                  }`}>
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Prezzo */}
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Prezzo</p>
          <div className="flex gap-2">
            {[
              { label: 'Tutti', val: false },
              { label: 'Gratis', val: true },
            ].map(opt => (
              <button key={opt.label}
                onClick={() => onChange({ ...filters, free: opt.val })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
                  ${filters.free === opt.val
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-transparent text-muted border-border'
                  }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-3 bg-accent text-bg rounded-xl text-sm font-bold">
          Applica filtri
        </button>
      </div>
    </>
  )
}
```

---

### 3.9 `EventCard.tsx` — restyle completo

Due varianti: `featured` (prima card, immagine + orario grande) e `row` (lista compatta).

```tsx
// EventCard.tsx — aggiungere prop variant: 'featured' | 'row' (default: 'row')

// FEATURED (desktop: prima card nella lista; mobile: card grande)
<div className="rounded-2xl overflow-hidden relative h-44 cursor-pointer group">
  {/* immagine o placeholder gradiente */}
  <img ... className="w-full h-full object-cover" />
  {/* scrim */}
  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
  {/* content */}
  <div className="absolute bottom-0 left-0 right-0 p-4">
    <div className="flex items-end justify-between mb-1">
      <span className="font-display font-black text-3xl text-text tracking-tighter leading-none">
        {event.startTime}
      </span>
      <span className="text-sm font-bold text-accent">{priceDisplay}</span>
    </div>
    <p className="text-sm font-semibold text-text mb-1">{event.title}</p>
    <div className="flex items-center gap-1.5 text-[11px] text-bright">
      <span className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: CATEGORY_COLORS[event.category] }} />
      {event.venue.name} · {CAT_LABELS[event.category]}
    </div>
  </div>
</div>

// ROW (lista compatta)
<div className="flex gap-3 items-center py-3 border-b border-border cursor-pointer group
  last:border-0 hover:bg-elev/50 -mx-1 px-1 rounded-lg transition-colors">
  {/* thumbnail */}
  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
    <img ... className="w-full h-full object-cover" />
  </div>
  {/* main */}
  <div className="flex-1 min-w-0">
    <div className="flex items-baseline gap-2 mb-0.5">
      <span className="font-display font-bold text-lg text-text tracking-tight leading-none">
        {event.startTime}
      </span>
      {event.endTime && <span className="text-[10px] text-muted">→ {event.endTime}</span>}
    </div>
    <p className="text-[13px] font-medium text-text truncate mb-0.5">{event.title}</p>
    <div className="flex items-center gap-1.5 text-[11px] text-bright">
      <span className="w-1 h-1 rounded-full shrink-0"
        style={{ background: CATEGORY_COLORS[event.category] }} />
      {event.venue.name}
    </div>
  </div>
  {/* price */}
  <span className={`text-xs font-bold shrink-0
    ${event.price === 'free' ? 'text-green-500' : 'text-accent'}`}>
    {priceDisplay}
  </span>
</div>
```

---

### 3.10 `SplitView.tsx` — restyle lista + mappa

**Desktop:** niente cambio strutturale (50/50 o 35/65), ma:
- Rimosso il toggle mobile lista/mappa dalla barra
- Lista usa il nuovo `EventCard` variant `featured` + `row`
- Mappa: aggiungere pill di stato in overlay

**Pill stato mappa** (dentro `EventMap.tsx`):
```tsx
// Dentro EventMap, sopra la Map, in position absolute
<div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
  bg-bg/80 backdrop-blur-md border border-border rounded-full
  px-3 py-1.5 text-xs font-semibold text-text pointer-events-none">
  {events.length} {isVenueMode ? 'locali' : 'eventi'}
</div>
```

**Mobile:** il toggle Lista/Mappa scompare da `SplitView` → sostituito da `BottomNav`.
Su mobile `SplitView` mostra sempre solo la lista; la mappa è tab separata nel `BottomNav`.

---

### 3.11 Nuovo `BottomNav.tsx` (solo mobile)

```tsx
// BottomNav.tsx
const tabs = [
  { id: 'events',  label: 'eventi', Icon: CalendarIcon },
  { id: 'map',     label: 'mappa',  Icon: MapIcon },
  { id: 'venues',  label: 'locali', Icon: HomeIcon },
]

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="md:hidden flex border-t border-border bg-bg pb-safe shrink-0">
      {tabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors
              ${active ? 'text-accent' : 'text-muted'}`}>
            <tab.Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
```

**Logica tab in `AppClient` (mobile):**
```
activeTab = 'events' → mostra SplitView senza mappa (solo lista)
activeTab = 'map'    → mostra EventMap fullscreen (eventi o locali, in base a filters.mode)
activeTab = 'venues' → setFilters({ mode: 'venues' }) + mostra SplitView lista
```

Quando l'utente switcha tra `events` e `venues` tramite BottomNav, aggiornare `filters.mode` di conseguenza. Quando va su `map`, *non* cambiare `filters.mode` — la mappa mostra quello che era già attivo.

---

### 3.12 `EventDetailModal.tsx` — restyle

- Hero più alto: `h-56` invece di `h-48`
- Orario grande in overlay sul hero: `font-display font-black text-5xl tracking-tighter`
- Nessuna emoji → icone SVG per date, time, location, price
- Info raccolte in una card `bg-card rounded-2xl p-4` con `divide-y divide-border`
- CTA sticky: `bg-accent text-bg` (non `text-white`, il bg è quasi-nero → il testo scuro leggibile)

---

### 3.13 `EmptyState.tsx` → rimosso

Sostituito da `LocationOverlay` che si apre automaticamente. Non serve più come schermata separata.

---

## 4. Tailwind — nuove classi utility necessarie

Aggiungere in `globals.css` (o `tailwind.config`):

```css
/* token come classi tailwind */
--color-card:      var(--card);
--color-elev:      var(--elev);
--color-elev2:     var(--elev2);
--color-bright:    var(--bright);
--color-border:    var(--border);
--color-border-md: var(--border-md);
--color-accent-lo: var(--accent-lo);
```

Usare come: `bg-card`, `text-bright`, `border-border`, `border-border-md`, `bg-elev`, `bg-accent-lo`

---

## 5. Checklist implementazione (ordine consigliato)

1. [ ] `globals.css` — nuovi token + font import
2. [ ] `ModeToggle.tsx` — rinomina + restyle da `ModeTab`
3. [ ] `DateTabs.tsx` — restyle da `DateScroll`
4. [ ] `CategoryChips.tsx` — nuovo componente
5. [ ] `LocationChip.tsx` + `LocationOverlay.tsx` — nuovo flusso location
6. [ ] `FilterSheet.tsx` — nuovo componente (sostituisce `RadiusSelector` visibile)
7. [ ] `EventCard.tsx` — aggiungere varianti `featured` / `row`
8. [ ] `EventGrid.tsx` → `EventList.tsx` — usa featured (primo) + row (resto)
9. [ ] `EventMap.tsx` — aggiungere pill stato + colori aggiornati (`--accent`)
10. [ ] `BottomNav.tsx` — nuovo componente mobile
11. [ ] `SplitView.tsx` — adattare per usare nuovi componenti
12. [ ] `AppClient.tsx` — refactor header desktop + mobile + nuovi stati
13. [ ] `EventDetailModal.tsx` — restyle hero + rimuovi emoji
14. [ ] `EmptyState.tsx` — rimuovere, sostituito da `LocationOverlay`
15. [ ] `useAppState.ts` — aggiungere `category` a `Filters`

---

## 6. Riferimento visivo

Il mockup interattivo completo è in `Serata Visual Direction.html` nella root del progetto (apribile nel browser). Mostra:
- 3 temi colore (usare **Notte**)
- Layout mobile home + event detail
- Layout desktop home
- Logica card featured + row

---

## 7. Note finali per Claude Code

- Non modificare `useAppState.ts` se non strettamente necessario (solo aggiunta `category` a `Filters`)
- Non toccare i file in `src/lib/sources/` e `src/app/api/`
- Il componente `LocationSearch.tsx` (Google Autocomplete) **non va riscritto** — va solo wrappato in `LocationOverlay`
- `EventMiniMap.tsx` rimane invariato — usato nel detail modal
- Testare prima desktop (1280px+), poi mobile
