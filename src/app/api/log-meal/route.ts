import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { awardSparksCapped } from '@/lib/sparks'

// Use admin client for all reads/writes so RLS never silently drops rows.
// Auth accepts either web Supabase cookies or native mobile bearer tokens.

export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data } = await admin
    .from('meals_log')
    .select('id,meal_name:description,meal_time,calories_estimated,protein_g,carbs_g,fats_g,logged_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('logged_at', { ascending: true })

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()
  // Clients send their local date; the server's UTC date is wrong for users far
  // from UTC (late-night meals landed on the previous/next day).
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toISOString().split('T')[0]
  const { data, error } = await admin.from('meals_log').insert({
    user_id: user.id,
    date,
    logged_at: new Date().toISOString(),
    description: body.meal_name ?? body.description ?? null,
    meal_time: body.meal_time ?? null,
    calories_estimated: body.calories_estimated ?? null,
    protein_g: body.protein_g ?? null,
    carbs_g: body.carbs_g ?? null,
    fats_g: body.fats_g ?? null,
    fiber_g: body.fiber_g ?? null,
    source: body.source ?? null,
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sparks: meal logged, max 3/day. Ref = the meal log id (each row unique);
  // the cap comes from the rolling-24h count so deleting+relogging can't farm.
  const sparksEarned = data?.id
    ? await awardSparksCapped(admin, user.id, 'meal_logged', String(data.id), 3, 24 * 3600 * 1000)
    : 0

  return NextResponse.json({ log: data, sparksEarned })
}

export async function DELETE(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const admin = createAdminClient()
  await admin.from('meals_log').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing log id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.meal_name !== undefined || body.description !== undefined) {
    update.description = body.meal_name ?? body.description
  }
  if (body.meal_time !== undefined) update.meal_time = body.meal_time
  if (body.calories_estimated !== undefined) update.calories_estimated = body.calories_estimated
  if (body.protein_g !== undefined) update.protein_g = body.protein_g
  if (body.carbs_g !== undefined) update.carbs_g = body.carbs_g
  if (body.fats_g !== undefined) update.fats_g = body.fats_g
  if (body.fiber_g !== undefined) update.fiber_g = body.fiber_g

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('meals_log')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
