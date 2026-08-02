# serata

**serata** aggregates events and venues from Google Maps and Ticketmaster into one map+list view, so I don't need five tabs open to figure out what's on tonight.

## Why

Deciding what to do on a night out means checking Maps, Instagram, Dice, and a couple more sites before getting a real picture. This pulls events and venues into a single interface: pick a city, filter by date/category, see everything on a map and a list side by side.

## What it does

- Search events and venues in your city (or current location)
- Filter by date, category (clubs, concerts, aperitivi, theatre...), distance, price
- Venues mode: Google ratings, filter by stars (3+ / 4+ / 4.5+)
- Open a venue → AI-generated recap of its reviews (vibe, noise level, average age, what it's good for)
- Side-by-side list + map on desktop, mobile-first with bottom nav
- Data from Google Maps, Ticketmaster, and other sources

## Screenshots

| desktop | mobile |
|---|---|
| ![desktop list+map](public/screenshots/Screenshot%202026-04-28%20222723.png) | ![mobile list](public/screenshots/Screenshot%202026-04-28%20222912.png) |
| ![desktop event](public/screenshots/Screenshot%202026-04-28%20222855.png) | ![desktop london](public/screenshots/Screenshot%202026-04-28%20223003.png) |

## Tech

Next.js, TypeScript, Tailwind CSS, Google Maps/Places API, Ticketmaster API, DeepSeek for the AI review recaps.

## Running it

```bash
npm install
npm run dev
```

open [http://localhost:3000](http://localhost:3000)

needs a `.env.local` with:

```
GOOGLE_PLACES_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
TICKETMASTER_API_KEY=...
DEEPSEEK_API_KEY=...       # for the AI venue recaps
```

## Missing / would redo

Coverage is still Italy-focused and depends entirely on how good Google Places/Ticketmaster data is for a given city — no manual/community source yet. No caching layer on the AI recap calls, so repeated lookups re-hit DeepSeek. If I kept going: more data sources (Instagram, Resident Advisor, local listings), smarter free-text search ("something chill tonight"), notifications for nearby events.

---

Personal project, built with Claude Code.
