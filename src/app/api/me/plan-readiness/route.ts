import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET /api/me/plan-readiness
// Returns "how fresh is the data Ion will use to rebuild your plan?" — used by
// the renewal freshness gates (diet + workout). Each item: { value, daysAgo, fresh }.
// Thresholds:
//   diet:    weight + measurements 7d, InBody 6 weeks (42d).
//   workout: any logged session 7d, per-lift strength entry 14d, compliance
//            "fresh"=>=70% of expected sessions completed in last 42 days.
export async function GET(req: Request) {
  const { user, error } = await getAuthenticatedUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [latestRes, latestCircumferenceRes, profileRes, activeWorkoutRes, workoutLogsRes] = await Promise.all([
    admin.from('measurements').select('weight_kg, date').eq('user_id', user.id).not('weight_kg', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('measurements').select('waist_cm, chest_cm, hips_cm, date').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
    admin.from('profiles').select('body_fat_pct, muscle_mass_kg, bmr_kcal, updated_at, training_days, strength_levels, goal').eq('user_id', user.id).maybeSingle(),
    admin.from('workout_plans').select('plan_json, start_date, end_date').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('workout_log').select('date, exercises, completion_pct').eq('user_id', user.id).gte('date', new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10)).order('date', { ascending: false }),
  ])

  const now = Date.now()
  const daysBetween = (d?: string | null) => (d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null)

  // Weight: from latest measurement row with a non-null weight
  const weightDays = daysBetween(latestRes.data?.date)
  // Circumferences: first row with any of waist/chest/hips
  const firstCirc = latestCircumferenceRes.data?.find(r => r.waist_cm != null || r.chest_cm != null || r.hips_cm != null)
  const circDays = daysBetween(firstCirc?.date)
  // InBody: profile has body_fat_pct or muscle_mass_kg; date = inbody_updated_at if present else profile.updated_at
  const inbodyPresent = profileRes.data?.body_fat_pct != null || profileRes.data?.muscle_mass_kg != null
  const inbodyDays = inbodyPresent ? daysBetween(profileRes.data?.updated_at) : null

  // ── Workout block ─────────────────────────────────────────────────────
  // 1. Last logged session date
  const lastLog = workoutLogsRes.data?.[0]
  const lastSessionDays = daysBetween(lastLog?.date)

  // 2. Compliance over the last 42 days vs. expected sessions
  const trainingDaysPerWeek = Math.max(1, parseInt(String(profileRes.data?.training_days || '4')) || 4)
  const expectedSessions = Math.round((trainingDaysPerWeek * 42) / 7)
  const actualSessions = workoutLogsRes.data?.length || 0
  const compliancePct = expectedSessions > 0 ? Math.min(100, Math.round((actualSessions / expectedSessions) * 100)) : 0

  // 3. Infer the main compound lifts from the active plan — pick the top 3-4
  //    exercises by frequency, prioritising compound categories.
  const planDays: any[] = activeWorkoutRes.data?.plan_json?.days || []
  const exerciseFreq = new Map<string, { name: string; category: string; count: number }>()
  for (const day of planDays) {
    for (const ex of day?.exercises || []) {
      const name = String(ex?.name || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      const prev = exerciseFreq.get(key) || { name, category: String(ex?.category || 'accessory'), count: 0 }
      prev.count += 1
      exerciseFreq.set(key, prev)
    }
  }
  // Prefer compound lifts; fall back to anything by frequency
  const all = Array.from(exerciseFreq.values())
  const compounds = all.filter(e => /compound/i.test(e.category))
  const mainExercises = (compounds.length ? compounds : all).sort((a, b) => b.count - a.count).slice(0, 4)

  // 4. Last logged weight × reps per main lift
  function findLastForExercise(name: string): { date: string | null; weight_kg: number | null; reps: number | null } {
    const needle = name.toLowerCase().trim()
    for (const log of workoutLogsRes.data || []) {
      const exs: any[] = Array.isArray(log.exercises) ? log.exercises : []
      const match = exs.find(e => String(e?.name || '').toLowerCase().trim() === needle)
      if (match) {
        // Pick the heaviest set actually performed
        const sets: any[] = Array.isArray(match?.sets_performed) ? match.sets_performed : Array.isArray(match?.sets) ? match.sets : []
        let best: { w: number; r: number } | null = null
        for (const s of sets) {
          const w = Number(s?.weight_kg ?? s?.weight)
          const r = Number(s?.reps)
          if (Number.isFinite(w) && w > 0 && (!best || w > best.w)) best = { w, r: Number.isFinite(r) ? r : 0 }
        }
        return { date: log.date, weight_kg: best?.w ?? Number(match?.weight_kg) ?? null, reps: best?.r ?? Number(match?.reps) ?? null }
      }
    }
    return { date: null, weight_kg: null, reps: null }
  }

  const lifts = mainExercises.map(({ name }) => {
    const last = findLastForExercise(name)
    const daysAgo = daysBetween(last.date)
    return {
      name,
      weight_kg: last.weight_kg,
      reps: last.reps,
      daysAgo,
      fresh: daysAgo != null && daysAgo <= 14,
    }
  })

  return NextResponse.json({
    weight: {
      value: latestRes.data?.weight_kg ?? null,
      daysAgo: weightDays,
      fresh: weightDays != null && weightDays <= 7,
    },
    measurements: {
      waist_cm: firstCirc?.waist_cm ?? null,
      chest_cm: firstCirc?.chest_cm ?? null,
      hips_cm: firstCirc?.hips_cm ?? null,
      daysAgo: circDays,
      fresh: circDays != null && circDays <= 7,
    },
    inbody: {
      present: inbodyPresent,
      body_fat_pct: profileRes.data?.body_fat_pct ?? null,
      muscle_mass_kg: profileRes.data?.muscle_mass_kg ?? null,
      bmr_kcal: profileRes.data?.bmr_kcal ?? null,
      daysAgo: inbodyDays,
      fresh: inbodyDays != null && inbodyDays <= 42,
    },
    workout: {
      lastSession: {
        date: lastLog?.date ?? null,
        daysAgo: lastSessionDays,
        fresh: lastSessionDays != null && lastSessionDays <= 7,
      },
      compliance: {
        actual: actualSessions,
        expected: expectedSessions,
        pct: compliancePct,
        // >=70% counts as good adherence; below that, Ion should simplify, not progress harder.
        fresh: compliancePct >= 70,
      },
      lifts,
      goal: profileRes.data?.goal ?? null,
    },
  })
}
