import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchYouTubeAPI, extractVideoId } from '@/lib/youtube-api'
import { getYouTubeId } from '@/lib/exercises'

export const runtime = 'nodejs'
export const maxDuration = 20

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

/** Quick YouTube oEmbed check — returns true if the video is public + embeddable. */
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

  const supabase = createServerClient()

  // ── 1. DB cache ───────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('exercise_videos')
    .select('video_id, searched_at, verified')
    .eq('exercise_name', name)
    .maybeSingle()

  if (cached) {
    const age = Date.now() - new Date(cached.searched_at).getTime()
    if (cached.verified || age < CACHE_TTL_MS) {
      // Re-validate cached IDs that have never been verified so bad IDs
      // from a previous scraper run don't persist forever.
      if (cached.video_id && !cached.verified) {
        const ok = await isEmbeddable(cached.video_id)
        if (ok) return NextResponse.json({ videoId: cached.video_id })
        // Stale bad ID — fall through to search fresh
      } else {
        return NextResponse.json({ videoId: cached.video_id ?? null })
      }
    }
  }

  // ── 2. Resolve + validate — waterfall ────────────────────────────────────
  //  a) YouTube Data API v3 (most reliable when YOUTUBE_API_KEY is set)
  //  b) Static curated map  (instant — but we validate before trusting)
  //  c) YouTube HTML scraper (no key needed)

  let videoId: string | null = null

  // 2a — YouTube Data API
  videoId = await searchYouTubeAPI(rawName)
  if (videoId) {
    const ok = await isEmbeddable(videoId)
    if (!ok) videoId = null
  }

  // 2b — Static map (validated via oEmbed)
  if (!videoId) {
    const staticId = getYouTubeId(rawName)
    if (staticId) {
      const ok = await isEmbeddable(staticId)
      videoId = ok ? staticId : null
    }
  }

  // 2c — Scraper fallback: search YouTube and pick first embeddable result
  if (!videoId) {
    videoId = await searchAndValidate(rawName)
  }

  // Ensure it's always a bare ID, never a full URL
  if (videoId) videoId = extractVideoId(videoId) ?? null

  // ── 3. Persist to DB cache ────────────────────────────────────────────────
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

// ── Scraper search with embedded oEmbed validation ───────────────────────────

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

    const html = await res.text()
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
