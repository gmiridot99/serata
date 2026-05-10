import { unstable_cache } from 'next/cache'

// Resolves a venue name + city to an Instagram handle via Google Custom Search.
// Requires GOOGLE_CSE_KEY (API key) and GOOGLE_CSE_CX (search engine id).
// Returns null if unset or no result. Cached for 7 days per (venue, city) pair.

type CSEItem = { link?: string }
type CSEResponse = { items?: CSEItem[] }

const HANDLE_RE = /^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)\/?/i

function extractHandle(url: string): string | null {
  const m = url.match(HANDLE_RE)
  if (!m) return null
  const handle = m[1]
  // Reject reserved Instagram paths that aren't user handles
  if (['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts'].includes(handle)) return null
  return handle.toLowerCase()
}

async function _resolveInstagramHandle(venue: string, city: string): Promise<string | null> {
  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!key || !cx) return null

  const q = `"${venue}" ${city} site:instagram.com`
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&num=3`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as CSEResponse
    for (const item of data.items ?? []) {
      if (!item.link) continue
      const handle = extractHandle(item.link)
      if (handle) return handle
    }
    return null
  } catch (err) {
    console.error('[ig:handle] resolve failed:', err)
    return null
  }
}

export const resolveInstagramHandle = unstable_cache(
  _resolveInstagramHandle,
  ['ig-handle'],
  { revalidate: 60 * 60 * 24 * 7 } // 7 days
)
