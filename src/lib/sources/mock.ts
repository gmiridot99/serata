import type { Event, EventCategory, EventQuery, EventSource } from '@/lib/types'

type MockEvent = Event & { city: string }

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
}

const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'mock-1',
    city: 'Milano',
    title: 'Club Amnesia Milano',
    description: 'Serata house e techno con i migliori DJ internazionali.',
    category: 'club',
    date: daysFromNow(1),
    startTime: '23:00',
    endTime: '05:00',
    venue: {
      name: 'Amnesia Milano',
      address: 'Via Segantini 40, Milano',
      lat: 45.4547,
      lng: 9.2218,
    },
    price: { min: 15, max: 25, currency: 'EUR' },
    ticketUrl: 'https://example.com/amnesia-milano',
    source: 'mock',
  },
  {
    id: 'mock-2',
    city: 'Milano',
    title: 'Aperitivo al Naviglio',
    description: 'Aperitivo con vista sul Naviglio Grande, spritz e tartine inclusi.',
    category: 'aperitivo',
    date: daysFromNow(2),
    startTime: '18:30',
    endTime: '21:00',
    venue: {
      name: 'Bar Naviglio Grande',
      address: 'Alzaia Naviglio Grande 14, Milano',
      lat: 45.4484,
      lng: 9.1742,
    },
    price: 'free',
    ticketUrl: 'https://example.com/aperitivo-naviglio',
    source: 'mock',
  },
  {
    id: 'mock-3',
    city: 'Milano',
    title: 'Teatro Piccolo — Il Seagull',
    description: 'Cechov portato in scena dalla compagnia stabile del Piccolo Teatro.',
    category: 'theatre',
    date: daysFromNow(3),
    startTime: '20:30',
    endTime: '23:00',
    venue: {
      name: 'Piccolo Teatro Milano',
      address: 'Via Rovello 2, Milano',
      lat: 45.4668,
      lng: 9.1863,
    },
    price: { min: 25, max: 35, currency: 'EUR' },
    ticketUrl: 'https://example.com/piccolo-teatro',
    source: 'mock',
  },
  {
    id: 'mock-4',
    city: 'Milano',
    title: 'Notte Bianca Brera',
    description: 'Gallerie aperte, musica dal vivo e street food nel quartiere Brera.',
    category: 'other',
    date: daysFromNow(5),
    startTime: '20:00',
    endTime: '02:00',
    venue: {
      name: 'Quartiere Brera',
      address: 'Via Brera 28, Milano',
      lat: 45.4724,
      lng: 9.1861,
    },
    price: 'free',
    ticketUrl: 'https://example.com/notte-bianca-brera',
    source: 'mock',
  },
  {
    id: 'mock-5',
    city: 'Milano',
    title: 'Concerto Jazz al Blue Note',
    description: 'Serata jazz con quartetto dal vivo e cena facoltativa.',
    category: 'concert',
    date: daysFromNow(7),
    startTime: '21:00',
    endTime: '23:30',
    venue: {
      name: 'Blue Note Milano',
      address: 'Via Borsieri 37, Milano',
      lat: 45.4899,
      lng: 9.1864,
    },
    price: { min: 20, max: 30, currency: 'EUR' },
    ticketUrl: 'https://example.com/bluenote-milano',
    source: 'mock',
  },
  {
    id: 'mock-6',
    city: 'Roma',
    title: 'Concerto Jazz — Casa del Jazz',
    description: 'Rassegna estiva di jazz internazionale nel parco della Casa del Jazz.',
    category: 'concert',
    date: daysFromNow(1),
    startTime: '21:00',
    endTime: '23:00',
    venue: {
      name: 'Casa del Jazz',
      address: 'Viale di Porta Ardeatina 55, Roma',
      lat: 41.8627,
      lng: 12.4796,
    },
    price: { min: 20, max: 20, currency: 'EUR' },
    ticketUrl: 'https://example.com/casa-del-jazz',
    source: 'mock',
  },
  {
    id: 'mock-7',
    city: 'Roma',
    title: 'Serata Techno — Goa Club',
    description: 'Techno e minimal con resident DJ e ospite internazionale.',
    category: 'club',
    date: daysFromNow(2),
    startTime: '23:30',
    endTime: '06:00',
    venue: {
      name: 'Goa Club Roma',
      address: 'Via Libetta 13, Roma',
      lat: 41.8522,
      lng: 12.4788,
    },
    price: { min: 10, max: 20, currency: 'EUR' },
    ticketUrl: 'https://example.com/goa-club',
    source: 'mock',
  },
  {
    id: 'mock-8',
    city: 'Roma',
    title: 'Concerto Rock — Piper Club',
    description: 'Serata rock con band emergenti italiane e headliner internazionale.',
    category: 'concert',
    date: daysFromNow(4),
    startTime: '21:00',
    endTime: '00:00',
    venue: {
      name: 'Piper Club Roma',
      address: 'Via Tagliamento 9, Roma',
      lat: 41.9232,
      lng: 12.4847,
    },
    price: { min: 15, max: 15, currency: 'EUR' },
    ticketUrl: 'https://example.com/piper-club',
    source: 'mock',
  },
  {
    id: 'mock-9',
    city: 'Roma',
    title: 'Aperitivo ai Fori',
    description: 'Aperitivo con vista sui Fori Imperiali, vini locali e taglieri.',
    category: 'aperitivo',
    date: daysFromNow(6),
    startTime: '18:00',
    endTime: '20:30',
    venue: {
      name: 'Terrazza ai Fori',
      address: 'Via Sacra 1, Roma',
      lat: 41.8921,
      lng: 12.4853,
    },
    price: 'free',
    ticketUrl: 'https://example.com/aperitivo-fori',
    source: 'mock',
  },
  {
    id: 'mock-10',
    city: 'Roma',
    title: 'Teatro Argentina — La Locandiera',
    description: 'Goldoni classico in una delle sale più storiche di Roma.',
    category: 'theatre',
    date: daysFromNow(8),
    startTime: '19:30',
    endTime: '22:00',
    venue: {
      name: 'Teatro Argentina',
      address: 'Largo di Torre Argentina 52, Roma',
      lat: 41.8960,
      lng: 12.4769,
    },
    price: { min: 18, max: 40, currency: 'EUR' },
    ticketUrl: 'https://example.com/teatro-argentina',
    source: 'mock',
  },
  {
    id: 'mock-11',
    city: 'Napoli',
    title: 'Spritz & Networking — Piazza Bellini',
    description: 'Aperitivo informale per professionisti creativi nel cuore di Napoli.',
    category: 'aperitivo',
    date: daysFromNow(1),
    startTime: '19:00',
    endTime: '22:00',
    venue: {
      name: 'Caffè Bellini',
      address: 'Piazza Bellini 72, Napoli',
      lat: 40.8518,
      lng: 14.2535,
    },
    price: 'free',
    ticketUrl: 'https://example.com/spritz-bellini',
    source: 'mock',
  },
  {
    id: 'mock-12',
    city: 'Napoli',
    title: 'Notte Bianca — Via Toledo',
    description: 'Negozi aperti, musica e spettacoli lungo il corso principale di Napoli.',
    category: 'other',
    date: daysFromNow(3),
    startTime: '20:00',
    endTime: '02:00',
    venue: {
      name: 'Via Toledo',
      address: 'Via Toledo 100, Napoli',
      lat: 40.836,
      lng: 14.249,
    },
    price: 'free',
    ticketUrl: 'https://example.com/notte-bianca-napoli',
    source: 'mock',
  },
  {
    id: 'mock-13',
    city: 'Napoli',
    title: 'Club Bourbon Street',
    description: 'Serata funk e soul al celebre club partenopeo.',
    category: 'club',
    date: daysFromNow(5),
    startTime: '22:00',
    endTime: '04:00',
    venue: {
      name: 'Bourbon Street Napoli',
      address: 'Via Bellini 52, Napoli',
      lat: 40.8521,
      lng: 14.254,
    },
    price: { min: 10, max: 15, currency: 'EUR' },
    ticketUrl: 'https://example.com/bourbon-street-napoli',
    source: 'mock',
  },
  {
    id: 'mock-14',
    city: 'Napoli',
    title: 'Concerto Classico al San Carlo',
    description: 'Orchestra del Teatro San Carlo: Beethoven e Brahms.',
    category: 'concert',
    date: daysFromNow(9),
    startTime: '20:00',
    endTime: '22:30',
    venue: {
      name: 'Teatro San Carlo',
      address: 'Via San Carlo 98, Napoli',
      lat: 40.8368,
      lng: 14.2493,
    },
    price: { min: 30, max: 80, currency: 'EUR' },
    ticketUrl: 'https://example.com/san-carlo',
    source: 'mock',
  },
  {
    id: 'mock-15',
    city: 'Napoli',
    title: 'Teatro Bellini — Eduardo De Filippo',
    description: 'Omaggio a Eduardo: "Natale in casa Cupiello" con la compagnia napoletana.',
    category: 'theatre',
    date: daysFromNow(11),
    startTime: '20:30',
    endTime: '22:30',
    venue: {
      name: 'Teatro Bellini',
      address: 'Via Conte di Ruvo 14, Napoli',
      lat: 40.8519,
      lng: 14.2538,
    },
    price: { min: 20, max: 45, currency: 'EUR' },
    ticketUrl: 'https://example.com/teatro-bellini-napoli',
    source: 'mock',
  },
]

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getWeekendDates(): Date[] {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  const daysToSat = day === 0 ? 6 : 6 - day
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  return [sat, sun]
}

export class MockSource implements EventSource {
  fetch(query: EventQuery): Promise<Event[]> {
    const cityLower = query.city.toLowerCase()

    const categories: EventCategory[] = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : []

    let results: MockEvent[] = MOCK_EVENTS.filter(e => {
      // city filter
      if (
        !e.city.toLowerCase().includes(cityLower) &&
        !e.venue.address.toLowerCase().includes(cityLower)
      ) {
        return false
      }

      // category filter
      if (categories.length > 0 && !categories.includes(e.category)) {
        return false
      }

      // free filter
      if (query.free && e.price !== 'free') {
        return false
      }

      // date filter
      if (query.date) {
        const eventDate = new Date(e.date)
        if (query.date === 'today') {
          if (!isSameDay(eventDate, new Date())) return false
        } else if (query.date === 'weekend') {
          const weekendDays = getWeekendDates()
          if (!weekendDays.some(d => isSameDay(eventDate, d))) return false
        } else {
          // Treat as YYYY-MM-DD format
          const queryDate = new Date(query.date)
          if (!isSameDay(eventDate, queryDate)) return false
        }
      }

      return true
    })

    // Strip the internal `city` field so returned objects match the Event type
    const events: Event[] = results.map(({ city: _city, ...event }) => event)
    return Promise.resolve(events)
  }

  fetchById(id: string): Promise<Event | null> {
    const found = MOCK_EVENTS.find(e => e.id === id)
    if (!found) return Promise.resolve(null)
    const { city: _city, ...event } = found
    return Promise.resolve(event)
  }
}
