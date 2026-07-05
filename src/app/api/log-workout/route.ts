import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * PR (personal record) detection. Each logged exercise may carry a
 * performance { weight, reps } (best working set). We score sets with the
 * Epley estimated 1RM — weight × (1 + reps/30) — so 80kg×8 correctly beats
 * 82.5kg×2 for strength-progress purposes, then compare against the user's
 * best prior score for the same exercise. First-time entries are baselines,
 * not PRs.
 */
type Pr = {
  exercise: string
  weight_kg: number
  reps: number
  prev_weight_kg: number
  prev_reps: number
}

function est1Rm(weight: number, reps: number): number {
  return weight * (1 + Math.min(reps, 15) / 30) // cap rep credit — 20-rep sets aren't strength PRs
}

function parsePerf(perf: any): { weight: number; reps: number } | null {
  const w = parseFloat(String(perf?.weight ?? '').replace(',', '.'))
  const r = parseInt(String(perf?.reps ?? ''), 10)
  if (!Number.isFinite(w) || w <= 0) return null
  return { weight: w, reps: Number.isFinite(r) && r > 0 ? r : 1 }
}

function detectPrs(todayExercises: any[], priorLogs: any[]): Pr[] {
  // Best prior est-1RM per exercise (lowercased name).
  const best: Record<string, { score: number; weight: number; reps: number }> = {}
  for (const log of priorLogs) {
    for (const ex of (Array.isArray(log?.exercises) ? log.exercises : [])) {
      const p = parsePerf(ex?.performance)
      if (!p) continue
      const key = String(ex?.name || '').toLowerCase().trim()
      if (!key) continue
      const score = est1Rm(p.weight, p.reps)
      if (!best[key] || score > best[key].score) best[key] = { score, weight: p.weight, reps: p.reps }
    }
  }

  const prs: Pr[] = []
  for (const ex of todayExercises) {
    if (!ex?.completed) continue
    const p = parsePerf(ex?.performance)
    if (!p) continue
    const key = String(ex?.name || '').toLowerCase().trim()
    const prior = best[key]
    if (!prior) continue // first log = baseline, not a PR
    if (est1Rm(p.weight, p.reps) > prior.score + 0.01) {
      prs.push({ exercise: ex.name, weight_kg: p.weight, reps: p.reps, prev_weight_kg: prior.weight, prev_reps: prior.reps })
    }
  }
  return prs
}

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

  // Fetch prior history BEFORE inserting today's log so today's numbers
  // can't compete against themselves.
  const todayExercises: any[] = Array.isArray(body.exercises) ? body.exercises : []
  let priorLogs: any[] = []
  if (todayExercises.some(ex => ex?.performance)) {
    let { data: prior, error: priorErr } = await admin
      .from('workout_log')
      .select('exercises')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(120)
    if (priorErr) {
      const fallback = await admin
        .from('workout_logs')
        .select('exercises')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(120)
      prior = fallback.data
    }
    priorLogs = prior || []
  }

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

  // ── PR detection + Ion celebration ─────────────────────────────────
  const prs = detectPrs(todayExercises, priorLogs)
  if (prs.length) {
    try {
      const { data: langRow } = await admin.from('users').select('language').eq('id', user.id).maybeSingle()
      const ar = langRow?.language === 'ar'
      const lines = prs.map(pr => ar
        ? `${pr.exercise}: ${pr.weight_kg} كغ × ${pr.reps} (سابقاً ${pr.prev_weight_kg} كغ × ${pr.prev_reps})`
        : `${pr.exercise}: ${pr.weight_kg}kg × ${pr.reps} (was ${pr.prev_weight_kg}kg × ${pr.prev_reps})`)
      const message = ar
        ? `🏆 رقم قياسي جديد اليوم!\n${lines.join('\n')}\n\nهذا هو التقدم الحقيقي — الأوزان تتحرك. استمر وسأبني عليه في دورتك القادمة.`
        : `🏆 New personal record${prs.length > 1 ? 's' : ''} today!\n${lines.join('\n')}\n\nThat's real progress — the weights are moving. Keep it up and I'll build on this in your next cycle.`
      await admin.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: message,
        message_type: 'text',
        metadata: { pr_celebration: true, prs },
      })
    } catch { /* celebration is best-effort — never fail the log for it */ }
  }

  return NextResponse.json({ log: data, prs })
}
