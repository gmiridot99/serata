import { unstable_cache } from 'next/cache'

export type VenueEnrichment = {
  vibe: string[]
  noise_level: string
  age_range: string
  best_for: string[]
  summary_it: string
}

async function _enrichVenue(placeId: string, reviews: string[]): Promise<VenueEnrichment> {
  const reviewText = reviews.length > 0
    ? reviews.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'Nessuna recensione disponibile.'

  const apiKey = process.env.DEEPSEEK_API_KEY

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente che analizza recensioni di locali italiani.',
        },
        {
          role: 'user',
          content: `Analizza queste recensioni del locale e rispondi SOLO con un oggetto JSON valido (nessun testo aggiuntivo):

${reviewText}

Formato JSON richiesto:
{
  "vibe": ["aggettivo1", "aggettivo2", "aggettivo3"],
  "noise_level": "silenzioso" | "moderato" | "animato" | "molto rumoroso",
  "age_range": "es. 25-40",
  "best_for": ["contesto1", "contesto2"],
  "summary_it": "Descrizione del locale in 2-3 frasi in italiano."
}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`)

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices?.[0]?.message?.content ?? ''

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<VenueEnrichment>
    return {
      vibe: Array.isArray(parsed.vibe) ? parsed.vibe : [],
      noise_level: typeof parsed.noise_level === 'string' ? parsed.noise_level : 'moderato',
      age_range: typeof parsed.age_range === 'string' ? parsed.age_range : '',
      best_for: Array.isArray(parsed.best_for) ? parsed.best_for : [],
      summary_it: typeof parsed.summary_it === 'string' ? parsed.summary_it : '',
    }
  } catch {
    return { vibe: [], noise_level: 'moderato', age_range: '', best_for: [], summary_it: '' }
  }
}

export const enrichVenue = unstable_cache(
  _enrichVenue,
  ['enrich-venue'],
  { revalidate: 86400 }
)
