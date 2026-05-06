// YouTube Data API v3 search — server-side only (uses YOUTUBE_API_KEY env var)
// Falls back gracefully when no API key is configured.

const STOP_WORDS = new Set([
  'the', 'and', 'or', 'with', 'for', 'a', 'an', 'proper',
  'form', 'exercise', 'tutorial', 'how', 'to',
])

function normalizeText(v: string) {
  return v.toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim()
}

function meaningfulTokens(v: string) {
  return normalizeText(v).split(' ').filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

function scoreTitle(exerciseName: string, title: string): number {
  const exerciseTokens = meaningfulTokens(exerciseName)
  const titleTokens    = meaningfulTokens(title)
  if (!exerciseTokens.length || !titleTokens.length) return 0

  const titleNorm    = normalizeText(title)
  const exactPhrase  = titleNorm.includes(normalizeText(exerciseName)) ? 4 : 0
  const matched      = exerciseTokens.filter(t => titleTokens.includes(t)).length
  const coverage     = matched / exerciseTokens.length
  const tutorialBonus = /\b(exercise|tutorial|proper|form|how|guide|demo)\b/.test(titleNorm) ? 2 : 0
  const noisePenalty  = /\b(motivation|fail|funny|reaction|shorts|prank|compilation)\b/.test(titleNorm) ? 3 : 0

  return exactPhrase + coverage * 10 + tutorialBonus - noisePenalty
}

/**
 * Search YouTube Data API v3 for an exercise tutorial video.
 * Returns the best matching video ID, or null if unavailable/no key.
 */
export async function searchYouTubeAPI(exerciseName: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  const query = `${exerciseName} exercise tutorial proper form`
  const url   = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('key',             apiKey)
  url.searchParams.set('q',               query)
  url.searchParams.set('part',            'snippet')
  url.searchParams.set('type',            'video')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('safeSearch',      'strict')
  url.searchParams.set('relevanceLanguage','en')
  url.searchParams.set('maxResults',      '8')

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    if (!res.ok) {
      console.error(`[youtube-api] Search failed ${res.status}:`, await res.text().catch(() => ''))
      return null
    }

    const data = await res.json()
    const items: any[] = data.items ?? []
    if (!items.length) return null

    // Score and sort; return highest scoring embeddable video ID
    const ranked = items
      .map((item: any) => ({
        id:    item.id?.videoId as string | undefined,
        score: scoreTitle(exerciseName, item.snippet?.title ?? ''),
      }))
      .filter(x => x.id && /^[a-zA-Z0-9_-]{11}$/.test(x.id))
      .sort((a, b) => b.score - a.score)

    return ranked[0]?.id ?? null
  } catch (err) {
    console.error('[youtube-api] Unexpected error:', err)
    return null
  }
}

/**
 * Extract an 11-char YouTube video ID from any of:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube-nocookie.com/embed/VIDEO_ID
 *   - A bare 11-char ID
 */
export function extractVideoId(input: string | null | undefined): string | null {
  if (!input) return null

  const s = input.trim()

  // Already a bare ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s

  try {
    const url = new URL(s)

    // youtu.be/<id>
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0]
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }

    // youtube.com/watch?v=<id>  or  youtube-nocookie.com/embed/<id>
    const v = url.searchParams.get('v')
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v

    const segments = url.pathname.split('/').filter(Boolean)
    const embedIdx = segments.indexOf('embed')
    if (embedIdx !== -1) {
      const id = segments[embedIdx + 1]
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }
  } catch {}

  return null
}
