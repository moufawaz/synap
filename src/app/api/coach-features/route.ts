import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

type Measurement = Record<string, any>

const DAY_MS = 86_400_000

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function weekStartKey(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function num(value: any, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getPlanMeals(dietPlan: any) {
  return Array.isArray(dietPlan?.meals) ? dietPlan.meals : []
}

function getMealCalories(meal: any) {
  return num(meal?.calories ?? meal?.kcal ?? meal?.calories_estimated)
}

function getMealProtein(meal: any) {
  return num(meal?.protein_g ?? meal?.protein)
}

function getMealCarbs(meal: any) {
  return num(meal?.carbs_g ?? meal?.carbs)
}

function getMealFat(meal: any) {
  return num(meal?.fat_g ?? meal?.fats_g ?? meal?.fat)
}

function getMacros(dietPlan: any) {
  return {
    calories: num(dietPlan?.daily_calories ?? dietPlan?.calories_per_day),
    protein: num(dietPlan?.macros?.protein_g ?? dietPlan?.protein_g),
    carbs: num(dietPlan?.macros?.carbs_g ?? dietPlan?.carbs_g),
    fat: num(dietPlan?.macros?.fat_g ?? dietPlan?.fat_g),
  }
}

function getTodayWorkout(workoutPlan: any) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = days[new Date().getDay()]
  const flatDays = Array.isArray(workoutPlan?.days)
    ? workoutPlan.days
    : Array.isArray(workoutPlan?.weeks)
      ? workoutPlan.weeks.flatMap((week: any) => Array.isArray(week.days) ? week.days : [])
      : []

  return flatDays.find((day: any) => {
    const name = String(day?.day_name ?? day?.day ?? '').toLowerCase()
    return name.includes(today.toLowerCase())
  }) ?? null
}

function buildMealNow(dietPlan: any, logs: any[]) {
  const macros = getMacros(dietPlan)
  const eaten = logs.reduce((acc, log) => ({
    calories: acc.calories + num(log.calories_estimated),
    protein: acc.protein + num(log.protein_g),
    carbs: acc.carbs + num(log.carbs_g),
    fat: acc.fat + num(log.fats_g),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const remaining = {
    calories: Math.max(macros.calories - eaten.calories, 0),
    protein: Math.max(macros.protein - eaten.protein, 0),
    carbs: Math.max(macros.carbs - eaten.carbs, 0),
    fat: Math.max(macros.fat - eaten.fat, 0),
  }

  const meals = getPlanMeals(dietPlan)
  const loggedNames = new Set(logs.map(log => String(log.meal_name ?? log.description ?? '').toLowerCase()))
  const nextPlanMeal = meals.find((meal: any) => {
    const name = String(meal?.name ?? meal?.meal_name ?? '').toLowerCase()
    return name && ![...loggedNames].some(logName => logName === name || logName.startsWith(name))
  })

  if (nextPlanMeal) {
    return {
      title: nextPlanMeal.name ?? nextPlanMeal.meal_name ?? 'Next planned meal',
      subtitle: nextPlanMeal.time ? `Planned for ${nextPlanMeal.time}` : 'Best next meal from your plan',
      items: Array.isArray(nextPlanMeal.foods)
        ? nextPlanMeal.foods.slice(0, 4).map((food: any) => `${food.item ?? food.name}${food.amount ? ` - ${food.amount}` : ''}`)
        : [],
      calories: getMealCalories(nextPlanMeal),
      protein_g: getMealProtein(nextPlanMeal),
      carbs_g: getMealCarbs(nextPlanMeal),
      fat_g: getMealFat(nextPlanMeal),
      remaining,
      reason: 'This is the next unchecked meal in your active plan.',
    }
  }

  const proteinTarget = Math.max(Math.min(remaining.protein, 45), 20)
  const calories = Math.max(Math.min(remaining.calories || 450, 650), 300)
  return {
    title: remaining.protein > 30 ? 'Protein-first recovery plate' : 'Light macro-balanced meal',
    subtitle: 'Built from what is left today',
    items: [
      `${Math.round(proteinTarget)}g protein from chicken, tuna, eggs, Greek yogurt, or lean beef`,
      remaining.carbs > 30 ? 'Add rice, potato, oats, or bread for controlled carbs' : 'Keep carbs light with salad or vegetables',
      remaining.fat > 12 ? 'Add olive oil, avocado, or nuts if you still need fats' : 'Keep fats low for the rest of the day',
    ],
    calories,
    protein_g: Math.round(proteinTarget),
    carbs_g: Math.round(Math.min(remaining.carbs, 55)),
    fat_g: Math.round(Math.min(remaining.fat, 18)),
    remaining,
    reason: 'Your planned meals are complete or unavailable, so this uses your remaining macros.',
  }
}

function buildWeeklyMission(workoutLogs: any[], mealLogs: any[], dietPlan: any) {
  const since = Date.now() - 7 * DAY_MS
  const recentWorkouts = workoutLogs.filter(log => new Date(log.logged_at ?? log.date).getTime() >= since)
  const recentMeals = mealLogs.filter(log => new Date(log.logged_at ?? log.date).getTime() >= since)
  const plannedTrainingDays = num(dietPlan?.training_days_per_week, 4)

  if (recentWorkouts.length < Math.max(2, plannedTrainingDays - 1)) {
    return {
      title: 'Close the training gap',
      target: Math.max(plannedTrainingDays - recentWorkouts.length, 1),
      progress: recentWorkouts.length,
      unit: 'workouts left',
      why: 'Your fastest win this week is getting the planned sessions done.',
    }
  }

  if (recentMeals.length < 14) {
    return {
      title: 'Log two meals per day',
      target: 14,
      progress: recentMeals.length,
      unit: 'meal logs',
      why: 'Better nutrition data gives Ion a cleaner signal for adjustments.',
    }
  }

  return {
    title: 'Protect the streak',
    target: 7,
    progress: Math.min(recentWorkouts.length, 7),
    unit: 'active days',
    why: 'You are consistent. This mission keeps the momentum visible.',
  }
}

function buildTimeline(profile: any, measurements: Measurement[], workoutLogs: any[], mealLogs: any[], chats: any[]) {
  const items: any[] = []

  if (profile?.created_at) {
    items.push({
      date: profile.created_at,
      type: 'start',
      title: 'Joined SYNAP',
      body: 'Ion started building your coaching memory from this day.',
    })
  }

  const oldest = measurements[measurements.length - 1]
  const latest = measurements[0]
  if (oldest?.weight_kg && latest?.weight_kg && oldest.id !== latest.id) {
    const change = num(latest.weight_kg) - num(oldest.weight_kg)
    items.push({
      date: latest.date ?? latest.created_at,
      type: 'body',
      title: `${change > 0 ? '+' : ''}${change.toFixed(1)} kg bodyweight change`,
      body: `From ${num(oldest.weight_kg).toFixed(1)} kg to ${num(latest.weight_kg).toFixed(1)} kg across your logged measurements.`,
    })
  }

  if (workoutLogs.length > 0) {
    items.push({
      date: workoutLogs[0].logged_at ?? workoutLogs[0].date,
      type: 'training',
      title: `${workoutLogs.length} workouts logged`,
      body: 'Your completed sessions are now part of Ion\'s coaching context.',
    })
  }

  if (mealLogs.length > 0) {
    items.push({
      date: mealLogs[0].logged_at ?? mealLogs[0].date,
      type: 'nutrition',
      title: `${mealLogs.length} meals logged recently`,
      body: 'Nutrition patterns are being remembered for smarter meal guidance.',
    })
  }

  if (chats[0]) {
    items.push({
      date: chats[0].created_at,
      type: 'chat',
      title: 'Latest Ion coaching note',
      body: String(chats[0].content ?? '').slice(0, 180),
    })
  }

  return items
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
}

function buildSymmetryCoach(latest: Measurement | undefined) {
  const pairs = [
    ['bicep_left_cm', 'bicep_right_cm', 'Biceps', 'single-arm curls and controlled cable curls'],
    ['thigh_left_cm', 'thigh_right_cm', 'Thighs', 'split squats, single-leg press, and step-ups'],
    ['calf_left_cm', 'calf_right_cm', 'Calves', 'single-leg calf raises with a pause at the top'],
  ] as const

  const items = pairs
    .map(([leftKey, rightKey, label, drill]) => {
      const left = num(latest?.[leftKey], NaN)
      const right = num(latest?.[rightKey], NaN)
      if (!Number.isFinite(left) || !Number.isFinite(right)) return null
      const gap = Math.abs(left - right)
      return {
        label,
        left,
        right,
        gap: Number(gap.toFixed(1)),
        dominant: left > right ? 'left' : right > left ? 'right' : 'even',
        drill,
        severity: gap > 1.5 ? 'high' : gap > 0.5 ? 'medium' : 'good',
      }
    })
    .filter(Boolean)

  const focus = items.find((item: any) => item.severity === 'high') ?? items.find((item: any) => item.severity === 'medium')

  return {
    status: focus ? 'attention' : items.length ? 'balanced' : 'needs_data',
    summary: focus
      ? `${focus.label} need attention: ${focus.gap} cm gap. Start unilateral work on the smaller side first.`
      : items.length
        ? 'Your logged left/right measurements look balanced. Keep training both sides evenly.'
        : 'Log left and right limb measurements to unlock symmetry coaching.',
    items,
    plan: focus
      ? [`Add 2 extra sets of ${focus.drill} on the smaller side.`, 'Match reps on the stronger side, do not exceed them.', 'Recheck measurements in 14 days.']
      : ['Keep normal bilateral work.', 'Use full range of motion.', 'Recheck every 2 weeks.'],
  }
}

function buildPlateau(measurements: Measurement[]) {
  const weights = measurements
    .filter(m => m.weight_kg != null)
    .slice(0, 4)
    .map(m => num(m.weight_kg))

  if (weights.length < 3) {
    return {
      detected: false,
      message: 'Log at least three bodyweight measurements to unlock plateau detection.',
      options: [],
    }
  }

  const variance = Math.max(...weights) - Math.min(...weights)
  const detected = variance < 0.5

  return {
    detected,
    variance: Number(variance.toFixed(1)),
    message: detected
      ? 'Your weight has stayed within 0.5 kg across recent measurements. Ion can apply a small adjustment.'
      : 'No plateau detected right now. Keep logging so Ion can catch it early.',
    options: detected
      ? [
          { id: 'calories', label: 'Adjust calories', description: 'Apply a small calorie change to the active diet plan.' },
          { id: 'cardio', label: 'Add cardio note', description: 'Add a low-impact cardio mission to the plan notes.' },
          { id: 'intensity', label: 'Training push', description: 'Add a progressive overload reminder to the workout plan.' },
        ]
      : [],
  }
}

export async function GET() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const today = todayKey()
  const weekStart = weekStartKey()

  const [profileRes, dietRes, workoutRes, measurementsRes, mealTodayRes, mealRecentRes, workoutLogRes, chatRes] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    admin.from('diet_plans').select('id, plan_json, created_at').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('workout_plans').select('id, plan_json, created_at').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(8),
    admin.from('meals_log').select('id,description,meal_time,calories_estimated,protein_g,carbs_g,fats_g,date,logged_at').eq('user_id', user.id).eq('date', today).order('logged_at', { ascending: true }),
    admin.from('meals_log').select('id,description,calories_estimated,protein_g,carbs_g,fats_g,date,logged_at').eq('user_id', user.id).gte('date', weekStart).order('logged_at', { ascending: false }).limit(60),
    admin.from('workout_log').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(30),
    admin.from('chat_messages').select('content,role,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  const dietPlan = dietRes.data?.plan_json ?? null
  const workoutPlan = workoutRes.data?.plan_json ?? null
  const measurements = measurementsRes.data ?? []
  const mealToday = (mealTodayRes.data ?? []).map((log: any) => ({ ...log, meal_name: log.description }))
  const mealRecent = (mealRecentRes.data ?? []).map((log: any) => ({ ...log, meal_name: log.description }))
  const workoutLogs = workoutLogRes.data ?? []

  return NextResponse.json({
    timeline: buildTimeline(profileRes.data, measurements, workoutLogs, mealRecent, chatRes.data ?? []),
    mealNow: buildMealNow(dietPlan, mealToday),
    weeklyMission: buildWeeklyMission(workoutLogs, mealRecent, dietPlan),
    symmetryCoach: buildSymmetryCoach(measurements[0]),
    plateau: buildPlateau(measurements),
    todayWorkout: getTodayWorkout(workoutPlan),
  })
}

export async function POST(req: Request) {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')
  if (!['calories', 'cardio', 'intensity'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [dietRes, workoutRes, measurementsRes] = await Promise.all([
    admin.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('workout_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('measurements').select('weight_kg,date').eq('user_id', user.id).order('date', { ascending: false }).limit(4),
  ])

  const plateau = buildPlateau(measurementsRes.data ?? [])
  if (!plateau.detected) {
    return NextResponse.json({ error: 'No plateau detected right now' }, { status: 409 })
  }

  let message = ''
  if (action === 'calories' && dietRes.data?.id) {
    const plan = { ...(dietRes.data.plan_json ?? {}) }
    const current = num(plan.daily_calories ?? plan.calories_per_day)
    const next = Math.max(current - 120, 1200)
    plan.daily_calories = next
    plan.ion_adjustments = [
      ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
      { date: todayKey(), type: 'plateau_calories', note: `Plateau adjustment: calories changed from ${current} to ${next}.` },
    ]
    await admin.from('diet_plans').update({ plan_json: plan }).eq('id', dietRes.data.id).eq('user_id', user.id)
    message = `I adjusted your active diet plan by -120 kcal to break the plateau. New target: ${next} kcal.`
  } else if (action === 'cardio' && workoutRes.data?.id) {
    const plan = { ...(workoutRes.data.plan_json ?? {}) }
    plan.ion_adjustments = [
      ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
      { date: todayKey(), type: 'plateau_cardio', note: 'Add 2 x 20-minute incline walks or easy bike sessions this week.' },
    ]
    await admin.from('workout_plans').update({ plan_json: plan }).eq('id', workoutRes.data.id).eq('user_id', user.id)
    message = 'I added a plateau cardio mission: 2 easy 20-minute sessions this week.'
  } else if (action === 'intensity' && workoutRes.data?.id) {
    const plan = { ...(workoutRes.data.plan_json ?? {}) }
    plan.ion_adjustments = [
      ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
      { date: todayKey(), type: 'plateau_intensity', note: 'For main lifts this week, add 1 rep per set or 2.5 kg when form is clean.' },
    ]
    await admin.from('workout_plans').update({ plan_json: plan }).eq('id', workoutRes.data.id).eq('user_id', user.id)
    message = 'I added a progressive overload push to your workout plan for this week.'
  } else {
    return NextResponse.json({ error: 'No active plan found for this action' }, { status: 404 })
  }

  await admin.from('chat_messages').insert({
    user_id: user.id,
    role: 'assistant',
    content: message,
    message_type: 'alert',
  })

  return NextResponse.json({ ok: true, message })
}
