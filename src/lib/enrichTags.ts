import { generateObject } from 'ai'
import { deepseek } from '@ai-sdk/deepseek'
import { z } from 'zod'
import type { Event, VibeTags } from '@/lib/types'

const BATCH_SIZE = 50
const TIMEOUT_MS = 10_000

const tagSchema = z.object({
  tags: z.array(
    z.object({
      id: z.string(),
      eventType: z
        .array(z.enum(['live', 'dj', 'festival', 'open-mic', 'silent-disco']))
        .optional(),
      setting: z.enum(['indoor', 'outdoor']).optional(),
    }),
  ),
})

const SYSTEM_PROMPT = `Sei un classificatore di eventi nightlife italiani. \
Rispondi solo con JSON valido secondo lo schema. \
Lascia campi undefined se non determinabile dalle informazioni fornite. \
"setting" indica se l'evento si svolge all'aperto (outdoor) o al chiuso (indoor); \
desumibile dal nome del venue, dalla descrizione, o dalla stagione (es. rooftop, garden, beach = outdoor).`

function buildUserPrompt(events: Event[]): string {
  const items = events
    .map(
      e =>
        `- id: ${e.id}\n  title: ${e.title}\n  venue: ${e.venue.name}\n  desc: ${e.description.slice(0, 200)}`,
    )
    .join('\n')
  return `Classifica i seguenti eventi.\n\n${items}\n\nRispondi con un oggetto { "tags": [...] } con un entry per ogni id.`
}

export async function enrichTags(events: Event[]): Promise<Map<string, VibeTags>> {
  const result = new Map<string, VibeTags>()
  if (events.length === 0) return result

  if (!process.env.DEEPSEEK_API_KEY) {
    return result
  }

  const model = deepseek('deepseek-chat')

  const batches: Event[][] = []
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    batches.push(events.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    try {
      const { object } = await generateObject({
        model,
        schema: tagSchema,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(batch),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      })
      for (const t of object.tags) {
        const tags: VibeTags = {}
        if (t.eventType && t.eventType.length > 0) tags.eventType = t.eventType
        if (t.setting) tags.setting = t.setting
        if (tags.eventType || tags.setting) result.set(t.id, tags)
      }
    } catch (err) {
      console.error('[vibeTags] enrichTags batch failed:', err)
    }
  }

  return result
}
