import { generateObject } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { z } from 'zod'

const TIMEOUT_MS = 30_000

export type ParsedCaption = {
  title: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  price: string      // 'free' or numeric string in EUR
  description: string
}

const itemSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.string(),
  description: z.string(),
})

const responseSchema = z.object({
  events: z.array(itemSchema),
})

const SYSTEM_PROMPT = `Sei un parser di post e didascalie di locali e venue italiani. \
Per ogni testo che descrive un evento futuro specifico, estrai: titolo, data (YYYY-MM-DD), orario di inizio (HH:MM), prezzo ("free" o numero in euro), descrizione breve. \
SKIP il testo se manca una data inferibile con sicurezza. \
Anno di riferimento: anno corrente o successivo, mai nel passato. \
Rispondi solo con JSON valido secondo lo schema.`

function buildUserPrompt(captions: string[]): string {
  const items = captions
    .map((c, i) => `[${i}] ${c.replace(/\n+/g, ' ').slice(0, 800)}`)
    .join('\n')
  return `Estrai eventi dai seguenti testi. Restituisci { "events": [...] } con solo le entry valide.\n\n${items}`
}

export async function parseCaptions(captions: string[]): Promise<ParsedCaption[]> {
  if (captions.length === 0) return []
  if (!process.env.DEEPSEEK_API_KEY) return []

  try {
    const { object } = await generateObject({
      model: deepseek('deepseek-chat'),
      schema: responseSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(captions),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const today = new Date().toISOString().slice(0, 10)
    return object.events.filter(e => e.date >= today)
  } catch (err) {
    console.error('[parse:captions] failed:', err)
    return []
  }
}
