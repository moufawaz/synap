import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { awardSparks } from '@/lib/sparks'

/**
 * Progress photos — private per-user storage in Supabase Storage.
 *
 * Bucket: 'progress-photos' (private; created lazily on first upload so no
 * manual Studio step is needed). Objects live under `${userId}/` so a user
 * can only ever see their own folder — all access goes through these routes
 * with the service role + the authenticated user's id as the prefix, and
 * reads are short-lived signed URLs.
 *
 *   GET    → list this user's photos (newest first) with 1h signed URLs
 *   POST   → { image: base64, mimeType? } → stores as {userId}/{date}_{ts}.jpg
 *   DELETE → ?name=<object name> (within the user's folder only)
 */

const BUCKET = 'progress-photos'
const MAX_PHOTOS = 60 // sanity cap per user

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  // 'already exists' is the happy path after first ever call.
  if (error && !/already exists|duplicate/i.test(error.message)) throw error
}

export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const { data: objects, error } = await admin.storage.from(BUCKET).list(user.id, {
    limit: MAX_PHOTOS,
    sortBy: { column: 'name', order: 'desc' }, // names start with YYYY-MM-DD → newest first
  })
  if (error) {
    // Bucket may simply not exist yet (no uploads ever) — that's an empty list.
    if (/bucket not found/i.test(error.message)) return NextResponse.json({ photos: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const photos: Array<{ name: string; date: string; url: string }> = []
  for (const obj of objects || []) {
    if (!obj?.name) continue
    const { data: signed } = await admin.storage.from(BUCKET)
      .createSignedUrl(`${user.id}/${obj.name}`, 3600)
    if (signed?.signedUrl) {
      photos.push({ name: obj.name, date: obj.name.slice(0, 10), url: signed.signedUrl })
    }
  }
  return NextResponse.json({ photos })
}

export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const body = await req.json().catch(() => ({}))
  const base64 = String(body?.image || '')
  if (!base64) return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  const mime = String(body?.mimeType || 'image/jpeg')
  if (!/^image\/(jpeg|jpg|png|heic|webp)$/i.test(mime)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64.replace(/^data:[^,]+,/, ''), 'base64')
  } catch {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }
  if (buffer.length < 1024) return NextResponse.json({ error: 'Image too small' }, { status: 400 })
  if (buffer.length > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 413 })

  await ensureBucket(admin)

  // Cap total photos per user — delete-oldest is the user's call, we just refuse.
  const { data: existing } = await admin.storage.from(BUCKET).list(user.id, { limit: MAX_PHOTOS + 1 })
  if ((existing?.length ?? 0) >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Photo limit reached (${MAX_PHOTOS}). Delete older photos first.` }, { status: 409 })
  }

  const date = new Date().toISOString().slice(0, 10)
  const name = `${date}_${Date.now()}.jpg`
  const { error } = await admin.storage.from(BUCKET).upload(`${user.id}/${name}`, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(`${user.id}/${name}`, 3600)

  // Sparks: progress photo, once per calendar month (ref = YYYY-MM).
  const sparksEarned = await awardSparks(admin, user.id, 'progress_photo', date.slice(0, 7))

  return NextResponse.json({ photo: { name, date, url: signed?.signedUrl || null }, sparksEarned })
}

export async function DELETE(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const url = new URL(req.url)
  const name = String(url.searchParams.get('name') || '')
  // Strict object-name check — no slashes, so nobody can reach outside their
  // own folder via ../ or absolute paths.
  if (!name || !/^[\w.-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid photo name' }, { status: 400 })
  }

  const { error } = await admin.storage.from(BUCKET).remove([`${user.id}/${name}`])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
