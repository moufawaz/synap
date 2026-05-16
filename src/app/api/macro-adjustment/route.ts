import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserSubscription, isEliteUser } from '@/lib/subscription'
import { recordAiUsage } from '@/lib/ai-usage'

// POST /api/macro-adjustment
// Generates weekly macro micro-adjustments for Elite users based on
// recent weight trend vs target, workout completion rate, and meal adherence.
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await getUserSubscription(user.id)
  if (!isEliteUser(sub)) {
    return NextResponse.json({ error: 'Macro adjustments are an Elite feature' }, { status: 403 })
  }

  const admin = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [profileRes, dietPlanRes, measurementsRes, workoutLogsRes, mealLogsRes] = await Promise.all([
    admin.from('profiles').select('name, goal, language').eq('user_id', user.id).maybeSingle(),
    admin.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).maybeSingle(),
    admin.from('measurements').select('date, weight_kg, body_fat_pct').eq('user_id', user.id).order('date', { ascending: false }).limit(4),
    admin.from('workout_log').select('date, completion_pct').eq('user_id', user.id).gte('date', sevenDaysAgo),
    admin.from('meals_log').select('date, calories_estimated, protein_g, carbs_g, fats_g').eq('user_id', user.id).gte('date', sevenDaysAgo),
  ])

  const profile = profileRes.data
  const dietPlan = dietPlanRes.data?.plan_json
  if (!profile || !dietPlan) return NextResponse.json({ message: 'No active plan to adjust' })

  const currentTargets = {
    calories: dietPlan.daily_calories || dietPlan.calories_per_day || 0,
    protein:  dietPlan.macros?.protein_g || dietPlan.protein_g || 0,
    carbs:    dietPlan.macros?.carbs_g   || dietPlan.carbs_g   || 0,
    fat:      dietPlan.macros?.fat_g     || dietPlan.fat_g     || 0,
  }

  const measurements = measurementsRes.data || []
  const workoutLogs  = workoutLogsRes.data  || []
  const mealLogs     = mealLogsRes.data     || []

  const weightTrend = measurements.length >= 2
    ? (measurements[0].weight_kg - measurements[measurements.length - 1].weight_kg).toFixed(1)
    : 'unknown'

  const avgCompletion = workoutLogs.length > 0
    ? Math.round(workoutLogs.reduce((s: number, l: any) => s + (l.completion_pct || 0), 0) / workoutLogs.length)
    : 0

  const avgCalories = mealLogs.length > 0
    ? Math.round(mealLogs.reduce((s: number, l: any) => s + (l.calories_estimated || 0), 0) / mealLogs.length)
    : 0

  const avgProtein = mealLogs.length > 0
    ? Math.round(mealLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0) / mealLogs.length)
    : 0

  const isArabic = profile.language === 'ar'

  const prompt = `You are Ion, an elite AI coach. A client needs weekly macro micro-adjustments.

CLIENT: ${profile.name} | Goal: ${profile.goal}
CURRENT TARGETS: ${currentTargets.calories} kcal | ${currentTargets.protein}g protein | ${currentTargets.carbs}g carbs | ${currentTargets.fat}g fat

LAST 7 DAYS DATA:
- Weight trend: ${weightTrend} kg (recent → older)
- Avg workout completion: ${avgCompletion}%
- Avg daily calories logged: ${avgCalories} kcal (vs target ${currentTargets.calories})
- Avg daily protein logged: ${avgProtein}g (vs target ${currentTargets.protein}g)

Based on this data, suggest SMALL adjustments (±50-150 kcal, ±5-15g macros). Be conservative.
Return a JSON object ONLY with this exact structure:
{
  "adjusted_calories": number,
  "adjusted_protein_g": number,
  "adjusted_carbs_g": number,
  "adjusted_fat_g": number,
  "rationale": "1-2 sentence explanation in ${isArabic ? 'Arabic' : 'English'}"
}
If no adjustment is needed, return current values with rationale "On track — no adjustment needed".`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  await recordAiUsage({ userId: user.id, feature: 'macro_adjustment', model: response.model, usage: response.usage })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let adjustment: any
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    adjustment = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch { adjustment = null }

  if (!adjustment) return NextResponse.json({ message: 'Could not generate adjustment' })

  // Apply adjustment to active diet plan
  if (dietPlanRes.data?.id) {
    const updatedPlan = {
      ...dietPlan,
      daily_calories:  adjustment.adjusted_calories,
      calories_per_day: adjustment.adjusted_calories,
      protein_g: adjustment.adjusted_protein_g,
      carbs_g:   adjustment.adjusted_carbs_g,
      fat_g:     adjustment.adjusted_fat_g,
      macros: {
        ...dietPlan.macros,
        protein_g: adjustment.adjusted_protein_g,
        carbs_g:   adjustment.adjusted_carbs_g,
        fat_g:     adjustment.adjusted_fat_g,
      },
    }
    await admin.from('diet_plans').update({ plan_json: updatedPlan }).eq('id', dietPlanRes.data.id)
  }

  return NextResponse.json({ adjustment, previousTargets: currentTargets })
}
