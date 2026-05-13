import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('workout_log')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const exercisesCompleted = Number(body.exercises_completed) || 0
  const exercisesTotal = Number(body.exercises_total || body.total_exercises) || 0
  const completionPct = exercisesTotal > 0
    ? Math.round((exercisesCompleted / exercisesTotal) * 100)
    : body.completion_pct ?? null

  const { data, error } = await supabase.from('workout_log').insert({
    user_id: user.id,
    date: body.date || new Date().toISOString().split('T')[0],
    day_name: body.day_name,
    duration_min: Number(body.duration_min ?? body.duration_minutes) || 0,
    exercises_completed: exercisesCompleted,
    completion_pct: completionPct,
    exercises: body.exercises ?? null,
    notes: body.notes || body.muscle_focus || null,
    logged_at: new Date().toISOString(),
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
