/**
 * /api/workout-session
 *
 * Lightweight cross-device sync for in-progress workout sessions.
 * Stores the session state (which exercises are done today) in the
 * existing chat_messages table using role='system' and message_type='text'
 * with metadata.session_type='workout_session', so zero schema changes are
 * needed and the DB check constraint is satisfied.
 * The chat history query filters role IN ('user','assistant','ion'),
 * so these rows never appear in the Ion chat.
 */

import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const SESSION_TYPE = 'workout_session'
const TODAY = () => new Date().toISOString().split('T')[0]

// GET /api/workout-session?date=YYYY-MM-DD
export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ session: null }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date') || TODAY()

  const { data } = await supabase
    .from('chat_messages')
    .select('metadata, created_at')
    .eq('user_id', user.id)
    .eq('role', 'system')
    .eq('message_type', 'text')
    .contains('metadata', { session_type: SESSION_TYPE })
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ session: data?.metadata ?? null })
}

// PUT /api/workout-session
// Body: { date, dayName, completedExercises: number[], exercisePerformance?: object }
export async function PUT(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date = TODAY(), dayName, completedExercises = [], exercisePerformance = {} } = body

  // Delete any existing session rows for today to keep it tidy (upsert by delete+insert)
  await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)
    .eq('role', 'system')
    .eq('message_type', 'text')
    .contains('metadata', { session_type: SESSION_TYPE })
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)

  const { error } = await supabase.from('chat_messages').insert({
    user_id:      user.id,
    role:         'system',
    content:      '',
    message_type: 'text',
    metadata: {
      session_type: SESSION_TYPE,
      date,
      dayName,
      completedExercises,
      exercisePerformance,
      updatedAt: new Date().toISOString(),
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/workout-session — call when session finishes
export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = TODAY()
  await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)
    .eq('role', 'system')
    .eq('message_type', 'text')
    .contains('metadata', { session_type: SESSION_TYPE })
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)

  return NextResponse.json({ ok: true })
}
