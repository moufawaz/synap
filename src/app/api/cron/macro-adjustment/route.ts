import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { recordAiUsage } from '@/lib/ai-usage'

// GET /api/cron/macro-adjustment — runs every Monday 7AM via Vercel Cron
// Generates weekly macro micro-adjustments for all active Elite users
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const weekStart = new Date().toISOString().split('T')[0]

  // Find all active Elite subscribers
  const { data: eliteUsers } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('plan_type', 'elite')
    .eq('status', 'active')

  if (!eliteUsers?.length) return NextResponse.json({ processed: 0 })

  const client = new Anthropic()
  let processed = 0

  for (const { user_id } of eliteUsers) {
    try {
      const [profileRes, dietPlanRes, measurementsRes, workoutLogsRes, mealLogsRes] = await Promise.all([
        admin.from('profiles').select('name, goal, language').eq('user_id', user_id).maybeSingle(),
        admin.from('diet_plans').select('id, plan_json').eq('user_id', user_id).eq('active', true).maybeSingle(),
        admin.from('measurements').select('date, weight_kg').eq('user_id', user_id).order('date', { ascending: false }).limit(4),
        admin.from('workout_log').select('completion_pct').eq('user_id', user_id).gte('date', sevenDaysAgo),
        admin.from('meals_log').select('calories_estimated, protein_g, carbs_g, fats_g').eq('user_id', user_id).gte('date', sevenDaysAgo),
      ])

      const profile = profileRes.data
      const dietPlan = dietPlanRes.data?.plan_json
      if (!profile || !dietPlan) continue

      const targets = {
        calories: dietPlan.daily_calories || dietPlan.calories_per_day || 0,
        protein: dietPlan.macros?.protein_g || dietPlan.protein_g || 0,
        carbs: dietPlan.macros?.carbs_g || dietPlan.carbs_g || 0,
        fat: dietPlan.macros?.fat_g || dietPlan.fat_g || 0,
      }

      const measurements = measurementsRes.data || []
      const workoutLogs = workoutLogsRes.data || []
      const mealLogs = mealLogsRes.data || []

      const weightTrend = measurements.length >= 2
        ? (measurements[0].weight_kg - measurements[measurements.length - 1].weight_kg).toFixed(1)
        : 'unknown'
      const avgCompletion = workoutLogs.length > 0
        ? Math.round(workoutLogs.reduce((s: number, l: any) => s + (l.completion_pct || 0), 0) / workoutLogs.length) : 0
      const avgCalories = mealLogs.length > 0
        ? Math.round(mealLogs.reduce((s: number, l: any) => s + (l.calories_estimated || 0), 0) / mealLogs.length) : 0
      const avgProtein = mealLogs.length > 0
        ? Math.round(mealLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0) / mealLogs.length) : 0

      const isArabic = profile.language === 'ar'
      const prompt = `Ion AI coach. Weekly macro micro-adjustment for ${profile.name} (goal: ${profile.goal}).
Current: ${targets.calories}kcal | ${targets.protein}g P | ${targets.carbs}g C | ${targets.fat}g F
Last 7 days: weight ${weightTrend}kg, workout ${avgCompletion}% complete, avg ${avgCalories}kcal logged, avg ${avgProtein}g protein
Suggest small conservative adjustments (±50-150kcal, ±5-15g macros). Return JSON only:
{"adjusted_calories":number,"adjusted_protein_g":number,"adjusted_carbs_g":number,"adjusted_fat_g":number,"rationale":"short reason in ${isArabic ? 'Arabic' : 'English'}"}`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }],
      })
      await recordAiUsage({ userId: user_id, feature: 'macro_adjustment_cron', model: response.model, usage: response.usage })

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      const adj = JSON.parse(jsonMatch[0])

      if (dietPlanRes.data?.id) {
        const updatedPlan = {
          ...dietPlan,
          daily_calories: adj.adjusted_calories,
          calories_per_day: adj.adjusted_calories,
          protein_g: adj.adjusted_protein_g,
          carbs_g: adj.adjusted_carbs_g,
          fat_g: adj.adjusted_fat_g,
          macros: { ...dietPlan.macros, protein_g: adj.adjusted_protein_g, carbs_g: adj.adjusted_carbs_g, fat_g: adj.adjusted_fat_g },
        }
        await admin.from('diet_plans').update({ plan_json: updatedPlan }).eq('id', dietPlanRes.data.id)
      }

      // Log the adjustment
      await admin.from('macro_adjustments').upsert({
        user_id, week_start: weekStart,
        previous_calories: targets.calories, adjusted_calories: adj.adjusted_calories,
        previous_protein_g: targets.protein, adjusted_protein_g: adj.adjusted_protein_g,
        previous_carbs_g: targets.carbs, adjusted_carbs_g: adj.adjusted_carbs_g,
        previous_fat_g: targets.fat, adjusted_fat_g: adj.adjusted_fat_g,
        rationale: adj.rationale,
      }, { onConflict: 'user_id,week_start' })

      processed++
    } catch (err) {
      console.error(`[macro-adjustment cron] failed for user ${user_id}:`, err)
    }
  }

  return NextResponse.json({ processed, total: eliteUsers.length })
}
