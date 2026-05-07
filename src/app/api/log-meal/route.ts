import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Use admin client for all reads/writes so RLS never silently drops rows.
// Auth check still goes through the user JWT (server client with cookies).

export async function GET(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url  = new URL(req.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data } = await admin
    .from('meals_log')
    .select('id,meal_name,meal_time,calories_estimated,protein_g,carbs_g,fats_g,logged_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('logged_at', { ascending: true })

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body  = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('meals_log').insert({
    user_id:    user.id,
    date:       new Date().toISOString().split('T')[0],
    logged_at:  new Date().toISOString(),
    ...body,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

export async function DELETE(req: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const admin = createAdminClient()
  await admin.from('meals_log').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
