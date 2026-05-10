import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { z } from 'zod'

const TIMEOUT_MS = 30_000

const VALID_EVENT_TYPES = ['live', 'dj', 'festival', 'open-mic', 'silent-disco'] as const
const VALID_TIME_OF_DAY = ['afternoon', 'aperitivo', 'dinner', 'late'] as const
const VALID_SETTING = ['indoor', 'outdoor'] as const

const responseSchema = z.object({
  filters: z.object({
    eventType: z.array(z.enum(VALID_EVENT_TYPES)).optional(),
    timeOfDay: z.array(z.enum(VALID_TIME_OF_DAY)).optional(),
    setting: z.enum(VALID_SETTING).optional(),
  }),
  rankedIds: z.array(z.string()),
  reasons: z.record(z.string(), z.string()),
})

const SYSTEM_PROMPT = `Sei un assistente che aiuta a trovare serate ed eventi nightlife in Italia. \
Ricevi una query in linguaggio naturale e una lista JSON di eventi. \
Il tuo compito:
1. Estrai i filtri dalla query nei seguenti campi:
   - eventType: subset di ["live","dj","festival","open-mic","silent-disco"]
   - timeOfDay: subset di ["afternoon","aperitivo","dinner","late"] (afternoon=14-18, aperitivo=18-20, dinner=20-22, late=22+)
   - setting: "indoor" oppure "outdoor"
   Lascia un campo undefined se non chiaramente espresso.
2. Ranka gli eventi della lista che meglio matchano la query (top 10 max). Usa SOLO id presenti nella lista fornita.
3. Per ogni id rankato, scrivi una breve motivazione in italiano (max 12 parole) nel campo "reasons".
Rispondi solo JSON valido secondo lo schema.`

type SearchResponse = z.infer<typeof responseSchema>

function emptyResponse(): SearchResponse {
  return { filters: {}, rankedIds: [], reasons: {} }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { query, events } = body as { query?: unknown; events?: unknown }

  if (typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'query string required' }, { status: 400 })
  }
  if (typeof events !== 'string') {
    return NextResponse.json({ error: 'events serialized string required' }, { status: 400 })
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(emptyResponse())
  }

  try {
    const model = deepseek('deepseek-chat')
    const { object } = await generateObject({
      model,
      schema: responseSchema,
      system: SYSTEM_PROMPT,
      prompt: `Query: ${query}\n\nEventi:\n${events}`,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return NextResponse.json(object)
  } catch (err) {
    console.error('[search] failed:', err)
    return NextResponse.json(emptyResponse())
  }
}
