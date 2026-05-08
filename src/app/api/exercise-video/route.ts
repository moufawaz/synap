import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchYouTubeAPI, extractVideoId } from '@/lib/youtube-api'
import { getYouTubeId } from '@/lib/exercises'

export const runtime = 'nodejs'
export const maxDuration = 20

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

/** Quick YouTube oEmbed check â€” returns true if the video is public + embeddable. */
async function isEmbeddable(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    )
    return res.ok
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawName = (searchParams.get('name') || '').trim()
  if (!rawName) return NextResponse.json({ videoId: null })

  const name = rawName.toLowerCase().trim()
  const hasApiKey = !!process.env.YOUTUBE_API_KEY

  console.info(`[exercise-video] "${name}" | api_key=${hasApiKey}`)

  const supabase = await createServerClient()

  // â”€â”€ 1. DB cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: cached } = await supabase
    .from('exercise_videos')
    .select('video_id, searched_at, verified')
    .eq('exercise_name', name)
    .maybeSingle()

  if (cached) {
    const age = Date.now() - new Date(cached.searched_at).getTime()
    if (cached.verified || age < CACHE_TTL_MS) {
      if (cached.video_id && !cached.verified) {
        // Re-validate unverified cached IDs â€” video may have been deleted since
        const ok = await isEmbeddable(cached.video_id)
        if (ok) {
          console.info(`[exercise-video] "${name}" â†’ cache hit ${cached.video_id}`)
          return NextResponse.json({ videoId: cached.video_id })
        }
        console.info(`[exercise-video] "${name}" â†’ cached ID ${cached.video_id} no longer embeddable, re-searching`)
        // Fall through to fresh search
      } else {
        console.info(`[exercise-video] "${name}" â†’ cache hit ${cached.video_id ?? 'null'}`)
        return NextResponse.json({ videoId: cached.video_id ?? null })
      }
    }
  }

  // â”€â”€ 2. Resolve + validate â€” waterfall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  a) YouTube Data API v3  â† reliable, uses YOUTUBE_API_KEY
  //  b) Static curated map   â† ~100 common exercises (validated via oEmbed)
  //  c) YouTube HTML scraper â† no key needed, Vercel may be rate-limited

  let videoId: string | null = null
  let source = 'none'

  // 2a â€” YouTube Data API v3
  if (hasApiKey) {
    videoId = await searchYouTubeAPI(rawName)
    if (videoId) {
      const ok = await isEmbeddable(videoId)
      if (ok) {
        source = 'youtube-api'
      } else {
        console.info(`[exercise-video] YouTube API returned ${videoId} but oEmbed failed`)
        videoId = null
      }
    }
  }

  // 2b â€” Static curated map (validated via oEmbed)
  if (!videoId) {
    const staticId = getYouTubeId(rawName)
    if (staticId) {
      const ok = await isEmbeddable(staticId)
      if (ok) {
        videoId = staticId
        source  = 'static-map'
      } else {
        console.info(`[exercise-video] Static map ID ${staticId} no longer embeddable`)
      }
    }
  }

  // 2c â€” HTML scraper fallback
  if (!videoId) {
    videoId = await searchAndValidate(rawName)
    if (videoId) source = 'scraper'
  }

  // Normalise to bare ID (should already be, but guard anyway)
  if (videoId) videoId = extractVideoId(videoId) ?? null

  console.info(`[exercise-video] "${name}" â†’ ${videoId ?? 'not found'} (${source})`)

  // â”€â”€ 3. Persist to DB cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try {
    await supabase.from('exercise_videos').upsert(
      { exercise_name: name, video_id: videoId, searched_at: new Date().toISOString() },
      { onConflict: 'exercise_name' }
    )
  } catch (err) {
    console.error('[exercise-video] cache write error:', err)
  }

  return NextResponse.json({ videoId: videoId ?? null })
}

// â”€â”€ Scraper: search YouTube HTML and pick first embeddable result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function searchAndValidate(exerciseName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${exerciseName} exercise tutorial proper form`)
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return null

    const html       = await res.text()
    const candidates = extractCandidates(html)

    for (const candidate of candidates.slice(0, 8)) {
      if (await isEmbeddable(candidate.id)) return candidate.id
    }
    return null
  } catch {
    return null
  }
}

function extractCandidates(html: string): Array<{ id: string }> {
  const found: Array<{ id: string }> = []
  const seen  = new Set<string>()
  const re    = /"videoId":"([a-zA-Z0-9_-]{11})"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && found.length < 12) {
    if (!seen.has(m[1])) { seen.add(m[1]); found.push({ id: m[1] }) }
  }
  return found
}
