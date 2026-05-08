import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Vercel Cron — runs every Friday at 8AM UTC ────────────────
// vercel.json: { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 8 * * 5" }] }

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr   = now.toISOString().split('T')[0]

  // ── Find all Elite subscribers ────────────────────────────────
  const { data: eliteSubs } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .eq('plan_type', 'elite')

  if (!eliteSubs || eliteSubs.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, message: 'No elite subscribers' })
  }

  let generated = 0
  let errors = 0

  for (const sub of eliteSubs) {
    try {
      await generateReportForUser(supabase, anthropic, sub.user_id, weekStartStr, weekEndStr)
      generated++
    } catch (err: any) {
      console.error(`[weekly-report] Failed for user ${sub.user_id}:`, err?.message)
      errors++
    }
  }

  return NextResponse.json({ ok: true, generated, errors, week: `${weekStartStr} → ${weekEndStr}` })
}

async function generateReportForUser(
  supabase: any,
  anthropic: Anthropic,
  userId: string,
  weekStart: string,
  weekEnd: string,
) {
  // Skip if report already exists for this week
  const { data: existing } = await supabase
    .from('weekly_reports')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (existing) return

  // Fetch user profile, measurements this week, workout logs this week, meal logs this week
  const [profileRes, measureRes, workoutRes, mealRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    supabase.from('measurements').select('*').eq('user_id', userId)
      .gte('date', weekStart).lte('date', weekEnd).order('date', { ascending: true }),
    supabase.from('workout_log').select('date,day_name,completion_pct,duration_min')
      .eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('meals_log').select('date,meal_time,description,calories_estimated,protein_g,carbs_g,fats_g')
      .eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
  ])

  const profile  = profileRes.data
  const measurements = measureRes.data || []
  const workouts = workoutRes.data || []
  const meals    = mealRes.data || []

  // Latest measurement from this week vs earliest
  const latestM = measurements[measurements.length - 1]
  const earliestM = measurements[0]
  const weightChange = latestM?.weight_kg && earliestM?.weight_kg
    ? parseFloat((latestM.weight_kg - earliestM.weight_kg).toFixed(1)) : null

  const workoutCount = workouts.length
  const avgCompletion = workouts.length > 0
    ? Math.round(workouts.reduce((s: number, w: any) => s + (w.completion_pct || 0), 0) / workouts.length)
    : null
  const avgDuration = workouts.length > 0
    ? Math.round(workouts.reduce((s: number, w: any) => s + (w.duration_min || 0), 0) / workouts.length)
    : null

  // Macro averages
  const loggedDays = [...new Set(meals.map((m: any) => m.date))].length
  const avgCal = meals.length > 0 && loggedDays > 0
    ? Math.round(meals.reduce((s: number, m: any) => s + (m.calories_estimated || 0), 0) / loggedDays)
    : null

  const prompt = `You are Ion, an elite AI personal trainer writing a weekly body composition report for ${profile?.name || 'this user'}.

USER PROFILE:
Goal: ${profile?.goal || 'Not specified'}
Weight: ${profile?.weight_kg}kg | Height: ${profile?.height_cm}cm
Training days/week: ${profile?.training_days}

THIS WEEK (${weekStart} to ${weekEnd}):
Workouts completed: ${workoutCount}
Average workout completion: ${avgCompletion != null ? `${avgCompletion}%` : 'No data'}
Average session duration: ${avgDuration != null ? `${avgDuration} min` : 'No data'}
Measurements taken: ${measurements.length}
Weight change this week: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : 'No data'}
Days with meal logs: ${loggedDays}
Average daily calories: ${avgCal != null ? `${avgCal} kcal` : 'No data'}

Latest measurements: ${latestM ? `Weight ${latestM.weight_kg}kg${latestM.body_fat_pct ? `, ${latestM.body_fat_pct}% BF` : ''}${latestM.waist_cm ? `, waist ${latestM.waist_cm}cm` : ''}` : 'None this week'}

Write a concise, personalised weekly body composition report in this exact markdown format:

## Weekly Body Composition Report — Week of ${weekStart}

### 📊 This Week at a Glance
[3-4 bullet points with the key stats from this week]

### ✅ What's Working
[2-3 specific positives based on the data]

### ⚠️ What Needs Attention
[1-2 specific things to improve — be direct, not vague]

### 🎯 Next Week's Focus
[2-3 actionable items Ion recommends for next week]

### Ion's Take
[1-2 sentences of honest, motivating coaching — use their name]

Keep it focused, data-driven, and personal. No filler. Max 350 words.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const reportMd = response.content[0].type === 'text' ? response.content[0].text : ''

  // Store in weekly_reports table
  await supabase.from('weekly_reports').upsert({
    user_id:    userId,
    week_start: weekStart,
    week_end:   weekEnd,
    report_md:  reportMd,
    sent_at:    new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' })
}
