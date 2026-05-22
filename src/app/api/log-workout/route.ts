import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const admin = createAdminClient()
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let { data, error } = await admin
    .from('workout_log')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(30)
  if (error) {
    const fallback = await admin
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(30)
    data = fallback.data
  }

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const admin = createAdminClient()
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const exercisesCompleted = Number(body.exercises_completed) || 0
  const exercisesTotal = Number(body.exercises_total || body.total_exercises) || 0
  const completionPct = exercisesTotal > 0
    ? Math.round((exercisesCompleted / exercisesTotal) * 100)
    : body.completion_pct ?? null

  const payload = {
    user_id: user.id,
    date: body.date || new Date().toISOString().split('T')[0],
    day_name: body.day_name,
    duration_min: Number(body.duration_min ?? body.duration_minutes) || 0,
    duration_minutes: Number(body.duration_min ?? body.duration_minutes) || 0,
    exercises_completed: exercisesCompleted,
    total_exercises: exercisesTotal,
    completion_pct: completionPct,
    exercises: body.exercises ?? null,
    notes: body.notes || body.muscle_focus || null,
    logged_at: new Date().toISOString(),
  }

  let { data, error } = await admin.from('workout_log').insert(payload).select().maybeSingle()
  if (error) {
    const fallback = await admin.from('workout_logs').insert(payload).select().maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
