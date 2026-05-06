import { NextResponse } from 'next/server'
import { resolveExerciseVideo } from '@/lib/youtube-search'

export const runtime = 'nodejs'
export const maxDuration = 15

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = (searchParams.get('name') || '').trim()
  const currentVideoId = (searchParams.get('currentVideoId') || '').trim() || null
  if (!name) return NextResponse.json({ videoId: null })

  const videoId = await resolveExerciseVideo(name, currentVideoId)
  return NextResponse.json({ videoId: videoId ?? null })
}
