import { NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// GET /api/me/dashboard
// Single endpoint that replaces the 5 separate dashboard calls:
//   /api/me/subscription
//   /api/plan-history
//   /api/log-meal?date=…
//   /api/save-profile   (GET)
//   /api/chat?limit=10
//
// All 5 data sets are fetched in parallel server-side so the app
// only pays one network RTT instead of five.

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function summarizeTodayWorkout(planJson: any) {
  if (!planJson) return null
  const weeks: any[] = planJson.weeks || (planJson.schedule ? [{ days: planJson.schedule }] : [])
  const allDays: any[] = []
  for (const week of weeks) {
    const days = week.days || week.schedule || []
    for (const day of days) allDays.push(day)
  }
  if (!allDays.length) return null

  const dayOfWeek = new Date().getDay() // 0=Sun
  const dayNames  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const todayName = dayNames[dayOfWeek]

  const day = allDays.find((d: any) => {
    const n = (d.day_name || d.day || '').toLowerCase()
    return n.includes(todayName.toLowerCase()) || n === String(dayOfWeek)
  }) || allDays[dayOfWeek % allDays.length]

  if (!day) return null
  return {
    day_name:    day.day_name || day.day || todayName,
    muscle_focus: day.muscle_focus || day.focus || null,
    duration_min: day.duration_min || null,
    is_rest_day:  !!(day.is_rest_day || day.rest || (day.exercises || []).length === 0),
    exercises:    (day.exercises || []).map((ex: any) => ({
      index:       ex.index ?? 0,
      name:        ex.name || ex.exercise_name || '',
      sets:        ex.sets ?? null,
      reps:        ex.reps ?? null,
      rest_sec:    ex.rest_sec ?? ex.rest ?? null,
      muscle_group: ex.muscle_group ?? null,
      video_id:    ex.video_id ?? null,
    })),
  }
}

function cycleTiming(plan: any) {
  if (!plan) return null
  const start = new Date(plan.start_date || plan.created_at)
  const durationDays = plan.plan_type === 'diet' ? 28 : 42
  const end = plan.end_date ? new Date(plan.end_date) : new Date(start.getTime() + durationDays * 86400000)
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000)
  const weeks    = Math.max(1, Math.ceil(durationDays / 7))
  return { label: `${weeks}w · ${daysLeft}d left`, daysLeft, expired: daysLeft <= 0 }
}

export async function GET(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = todayIso()

  // ── All queries in parallel ──────────────────────────────────
  const [
    sub,
    profileRes,
    measurementsRes,
    dietPlanRes,
    workoutPlanRes,
    mealLogsRes,
    lastIonMsgRes,
  ] = await Promise.all([
    getUserSubscription(user.id),
    admin.from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    admin.from('measurements')
      .select('weight_kg, measured_at, created_at')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(2),
    admin.from('diet_plans')
      .select('id, created_at, start_date, end_date, plan_json, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('workout_plans')
      .select('id, created_at, start_date, end_date, plan_json, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('meal_logs')
      .select('id, meal_name, meal_time, calories_estimated, protein_g, carbs_g, fats_g, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: false }),
    admin.from('chat_messages')
      .select('content, role, created_at')
      .eq('user_id', user.id)
      .in('role', ['assistant', 'ion'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const tier        = effectivePlan(sub)
  const profile     = profileRes.data || null
  const measurements = measurementsRes.data || []
  const dietPlan    = dietPlanRes.data || null
  const workoutPlan = workoutPlanRes.data || null
  const mealLogs    = mealLogsRes.data || []

  // Parse last Ion message
  let lastIonMessage: string | null = null
  if (lastIonMsgRes.data?.content) {
    try {
      const parsed = JSON.parse(lastIonMsgRes.data.content)
      lastIonMessage = parsed.message ?? parsed.reply ?? parsed.content ?? null
    } catch {
      lastIonMessage = lastIonMsgRes.data.content.trim() || null
    }
  }

  return NextResponse.json({
    // Subscription
    subscription: {
      tier,
      status: sub?.status ?? null,
      planName: sub?.plan_name ?? null,
    },
    // Profile + measurements
    profile,
    measurements,
    // Plans
    activeDietPlan: dietPlan ? {
      id: dietPlan.id,
      created_at: dietPlan.created_at,
      plan_json: dietPlan.plan_json,
    } : null,
    activeWorkoutPlan: workoutPlan ? {
      id: workoutPlan.id,
      created_at: workoutPlan.created_at,
      plan_json: workoutPlan.plan_json,
    } : null,
    todayWorkout: summarizeTodayWorkout(workoutPlan?.plan_json),
    timing: {
      diet:    cycleTiming(dietPlan    ? { ...dietPlan,    plan_type: 'diet'    } : null),
      workout: cycleTiming(workoutPlan ? { ...workoutPlan, plan_type: 'workout' } : null),
    },
    // Nutrition
    mealLogs,
    // Ion
    lastIonMessage,
  })
}
