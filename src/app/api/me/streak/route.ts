import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

/**
 * GET /api/me/streak
 * Weekly training streak + this-week consistency, computed from workout_log.
 *
 * Week model: SUNDAY-start weeks (matches the plan's canonical day order and
 * the region's working week). A past week counts toward the streak when its
 * logged sessions >= the user's planned training days (from the profile,
 * capped at 6 — nobody should need a 7-day week to keep a streak alive).
 *
 * Streak rule: count consecutive qualifying weeks walking backwards from the
 * CURRENT week. The in-progress week never breaks the streak (it hasn't had
 * its chance yet) — it only extends it once it qualifies. So:
 *   current week qualified → streak includes it
 *   current week not yet   → streak = consecutive qualified weeks before it
 */

function sundayWeekStart(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay()) // getUTCDay: 0 = Sunday
  return copy.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const since = new Date(Date.now() - 26 * 7 * 86400000).toISOString().slice(0, 10)
  const [{ data: profile }, logsRes] = await Promise.all([
    admin.from('profiles').select('training_days').eq('user_id', user.id).maybeSingle(),
    admin.from('workout_log').select('date').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }).limit(400),
  ])
  let logs = logsRes.data
  if (logsRes.error) {
    const fallback = await admin.from('workout_logs').select('date').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }).limit(400)
    logs = fallback.data
  }

  const target = Math.min(6, Math.max(1, parseInt(String(profile?.training_days ?? '3'), 10) || 3))

  // Sessions per Sunday-start week. Multiple logs on one date count once —
  // a streak measures showing up, not double-logging.
  const daysByWeek: Record<string, Set<string>> = {}
  for (const row of logs || []) {
    const date = String(row?.date || '').slice(0, 10)
    if (!date) continue
    const wk = sundayWeekStart(new Date(`${date}T00:00:00Z`))
    ;(daysByWeek[wk] ||= new Set()).add(date)
  }

  const now = new Date()
  const currentWeek = sundayWeekStart(now)
  const thisWeekDone = daysByWeek[currentWeek]?.size ?? 0

  let streak = 0
  // Current week extends the streak early if already qualified.
  if (thisWeekDone >= target) streak++
  // Walk backwards week by week from last week.
  for (let i = 1; i <= 26; i++) {
    const wkStart = sundayWeekStart(new Date(now.getTime() - i * 7 * 86400000))
    if ((daysByWeek[wkStart]?.size ?? 0) >= target) streak++
    else break
  }

  return NextResponse.json({
    streakWeeks: streak,
    thisWeek: { done: thisWeekDone, target },
  })
}
