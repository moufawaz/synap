import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

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
  const { data, error } = await admin.from('meals_log').insert({
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
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
  return NextResponse.json({ log: data })
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
