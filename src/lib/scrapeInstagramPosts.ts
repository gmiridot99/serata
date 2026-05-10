// Scrapes the public Instagram profile page for a handle and extracts post
// captions from the inline JSON. Highly fragile — Instagram rate-limits and
// rotates the embedded data shape often. Returns [] on any failure.

const POST_LIMIT = 12
const FETCH_TIMEOUT_MS = 8_000

type RawEdge = {
  node?: {
    edge_media_to_caption?: {
      edges?: Array<{ node?: { text?: string } }>
    }
  }
}

function jitterMs(): number {
  // 800–1600ms jitter to spread requests
  return 800 + Math.floor(Math.random() * 800)
}

function extractCaptionsFromJson(html: string): string[] {
  // Instagram inlines profile data in script blocks. Try the common shapes.
  // Pattern 1: edge_owner_to_timeline_media
  const captions: string[] = []
  const blockRe = /"edge_owner_to_timeline_media"\s*:\s*\{[^]*?"edges"\s*:\s*(\[[^]*?\])/
  const blockMatch = html.match(blockRe)
  if (blockMatch) {
    try {
      const edges = JSON.parse(blockMatch[1]) as RawEdge[]
      for (const e of edges) {
        const text = e.node?.edge_media_to_caption?.edges?.[0]?.node?.text
        if (text) captions.push(text)
        if (captions.length >= POST_LIMIT) break
      }
      if (captions.length > 0) return captions
    } catch {
      // fall through to next strategy
    }
  }

  // Pattern 2: bare caption text fields anywhere in the document
  const captionRe = /"text"\s*:\s*"((?:[^"\\]|\\.){10,1500}?)"/g
  let m: RegExpExecArray | null
  while ((m = captionRe.exec(html)) !== null) {
    try {
      // Re-parse to unescape JSON string
      const text = JSON.parse(`"${m[1]}"`) as string
      if (text.length > 20) captions.push(text)
    } catch {
      // skip
    }
    if (captions.length >= POST_LIMIT) break
  }
  return captions
}

export async function scrapeInstagramPosts(handle: string): Promise<string[]> {
  await new Promise(r => setTimeout(r, jitterMs()))

  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (res.status === 429 || res.status === 401 || res.status === 403) return []
    if (!res.ok) return []
    const html = await res.text()
    if (html.includes('login_and_signup_page')) return []
    return extractCaptionsFromJson(html)
  } catch (err) {
    console.error('[ig:scrape] failed for', handle, err)
    return []
  }
}
