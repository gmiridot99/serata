const INTENT_MAP: Array<{ keys: string[]; terms: string[] }> = [
  {
    keys: ['discoteca', 'disco', 'nightclub', 'rave', 'techno', 'elettronica', 'house', 'dance floor'],
    terms: ['nightclub dance', 'discoteca elettronica', 'club night dance'],
  },
  {
    keys: ['aperitivo', 'spritz', 'happy hour', 'apericena'],
    terms: ['aperitivo bar', 'cocktail bar happy hour', 'wine bar aperitivo'],
  },
  {
    keys: ['jazz', 'blues', 'soul', 'swing', 'bossa nova'],
    terms: ['jazz bar live music', 'jazz lounge', 'jazz club live'],
  },
  {
    keys: ['live', 'concerto', 'musica live', 'band', 'rock', 'indie', 'folk'],
    terms: ['live music bar', 'music venue live', 'live concert venue'],
  },
  {
    keys: ['cocktail', 'mixology', 'speakeasy'],
    terms: ['cocktail bar', 'mixology bar', 'craft cocktail lounge'],
  },
  {
    keys: ['vino', 'wine', 'enoteca', 'cantina'],
    terms: ['wine bar', 'enoteca vini', 'wine lounge'],
  },
  {
    keys: ['romantico', 'appuntamento', 'coppia', 'intimo'],
    terms: ['wine bar romantico', 'cocktail lounge elegante', 'rooftop bar'],
  },
  {
    keys: ['rooftop', 'terrazza', 'tetto', 'panorama', 'vista'],
    terms: ['rooftop bar', 'terrazza panoramica bar', 'sky bar'],
  },
  {
    keys: ['karaoke'],
    terms: ['karaoke bar', 'karaoke club', 'karaoke locale serata'],
  },
  {
    keys: ['birra', 'pub', 'birreria', 'craft beer', 'artigianale'],
    terms: ['pub birra artigianale', 'craft beer bar', 'birreria pub'],
  },
  {
    keys: ['pizza', 'pizzeria'],
    terms: ['pizzeria', 'pizza napoletana', 'pizzeria con forno a legna'],
  },
  {
    keys: ['cena', 'dinner', 'ristorante', 'mangiare'],
    terms: ['ristorante', 'trattoria italiana', 'bistrot cena'],
  },
  {
    keys: ['teatro', 'spettacolo', 'commedia', 'cabaret'],
    terms: ['teatro', 'teatro commedia', 'performing arts theater'],
  },
  {
    keys: ['lounge', 'rilassante', 'tranquillo', 'quiet', 'relax'],
    terms: ['lounge bar', 'wine bar tranquillo', 'cocktail lounge'],
  },
  {
    keys: ['club', 'locale notturno', 'serata', 'notte'],
    terms: ['nightclub', 'club serata', 'locale notturno'],
  },
]

export function expandVenueQuery(q: string): string[] {
  const trimmed = q.trim()

  if (!trimmed) {
    return ['bar locale notturno', 'cocktail bar aperitivo', 'wine bar']
  }

  const lower = trimmed.toLowerCase()

  for (const { keys, terms } of INTENT_MAP) {
    if (keys.some((k) => lower.includes(k))) {
      return terms
    }
  }

  // No match: original + two variations
  return [trimmed, `${trimmed} bar`, `${trimmed} locale`]
}
