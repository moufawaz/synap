import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchYouTubeAPI, extractVideoId } from '@/lib/youtube-api'
import { resolveExerciseVideo } from '@/lib/youtube-search'

export const runtime = 'nodejs'
export const maxDuration = 20

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawName = (searchParams.get('name') || '').trim()
  if (!rawName) return NextResponse.json({ videoId: null })

  // Normalise for consistent cache keys
  const name = rawName.toLowerCase().trim()

  const supabase = createServerClient()

  // ── 1. Check DB cache ─────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from('exercise_videos')
    .select('video_id, searched_at, verified')
    .eq('exercise_name', name)
    .maybeSingle()

  if (cached) {
    const age = Date.now() - new Date(cached.searched_at).getTime()
    // Verified (curated) entries never expire; dynamic ones expire after TTL
    if (cached.verified || age < CACHE_TTL_MS) {
      return NextResponse.json({ videoId: cached.video_id ?? null })
    }
  }

  // ── 2. Resolve video — three-tier waterfall ───────────────────────────────
  //   a) YouTube Data API v3  (preferred — reliable, quota-protected)
  //   b) Static exercise map  (instant, curated)
  //   c) YouTube HTML scraper (fallback — no API key required)
  let videoId: string | null = null

  // 2a — YouTube Data API
  videoId = await searchYouTubeAPI(rawName)

  // 2b / 2c — static map + scraper fallback (resolveExerciseVideo handles both)
  if (!videoId) {
    videoId = await resolveExerciseVideo(rawName)
  }

  // Normalise: if somehow a full URL crept in, extract the bare ID
  if (videoId) videoId = extractVideoId(videoId) ?? null

  // ── 3. Persist result to DB cache ─────────────────────────────────────────
  try {
    await supabase.from('exercise_videos').upsert(
      {
        exercise_name: name,
        video_id:      videoId,
        searched_at:   new Date().toISOString(),
      },
      { onConflict: 'exercise_name' }
    )
  } catch (err) {
    // Cache write failure is non-fatal — still return the found ID
    console.error('[exercise-video] Cache write error:', err)
  }

  return NextResponse.json({ videoId: videoId ?? null })
}
