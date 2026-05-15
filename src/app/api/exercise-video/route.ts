import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchYouTubeAPI, extractVideoId } from '@/lib/youtube-api'
import { getYouTubeId } from '@/lib/exercises'
import { primaryVideoSearchTarget } from '@/lib/exercise-video-targets'

export const runtime = 'nodejs'
export const maxDuration = 20

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

/** Quick YouTube oEmbed check: returns true if the video is public and embeddable. */
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

  const searchName = primaryVideoSearchTarget(rawName)
  if (!searchName) return NextResponse.json({ videoId: null, multipleTargets: true })

  const name = searchName.toLowerCase().trim()
  const hasApiKey = !!process.env.YOUTUBE_API_KEY

  console.info(`[exercise-video] "${name}" | api_key=${hasApiKey}`)

  const supabase = await createServerClient()

  // 1. DB cache
  const { data: cached } = await supabase
    .from('exercise_videos')
    .select('video_id, searched_at, verified')
    .eq('exercise_name', name)
    .maybeSingle()

  if (cached) {
    const age = Date.now() - new Date(cached.searched_at).getTime()
    if (cached.verified || age < CACHE_TTL_MS) {
      if (cached.video_id && !cached.verified) {
        // Re-validate unverified cached IDs; video may have been deleted since.
        const ok = await isEmbeddable(cached.video_id)
        if (ok) {
          console.info(`[exercise-video] "${name}" -> cache hit ${cached.video_id}`)
          return NextResponse.json({ videoId: cached.video_id })
        }
        console.info(`[exercise-video] "${name}" -> cached ID ${cached.video_id} no longer embeddable, re-searching`)
        // Fall through to fresh search
      } else {
        console.info(`[exercise-video] "${name}" -> cache hit ${cached.video_id ?? 'null'}`)
        return NextResponse.json({ videoId: cached.video_id ?? null })
      }
    }
  }

  // Resolve and validate using a waterfall:
  //  a) YouTube Data API v3: reliable, uses YOUTUBE_API_KEY.
  //  b) Static curated map: common exercises validated via oEmbed.
  //  c) YouTube HTML scraper: no key needed, may be rate-limited.

  let videoId: string | null = null
  let source = 'none'

  // 2a: YouTube Data API v3
  if (hasApiKey) {
    videoId = await searchYouTubeAPI(searchName)
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

  // 2b: Static curated map (validated via oEmbed)
  if (!videoId) {
    const staticId = getYouTubeId(searchName)
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

  // 2c: HTML scraper fallback
  if (!videoId) {
    videoId = await searchAndValidate(searchName)
    if (videoId) source = 'scraper'
  }

  // Normalise to bare ID (should already be, but guard anyway)
  if (videoId) videoId = extractVideoId(videoId) ?? null

  console.info(`[exercise-video] "${name}" -> ${videoId ?? 'not found'} (${source})`)

  // 3. Persist to DB cache
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

// Scraper: search YouTube HTML and pick first embeddable result.

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
