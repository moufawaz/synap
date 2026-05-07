import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/onesignal'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'

// POST /api/renew-plan — called by the adaptation-check job when a plan is expiring
export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planType }: { planType: 'diet' | 'workout' } = await req.json()
    if (!planType) return NextResponse.json({ error: 'Missing planType' }, { status: 400 })

    // Load profile + measurements
    const [profileRes, measureRes, oldPlanRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(4),
      supabase.from(planType === 'diet' ? 'diet_plans' : 'workout_plans')
        .select('*').eq('user_id', user.id).eq('active', true).single(),
    ])

    const profile = profileRes.data
    const recentMeasurements = measureRes.data || []

    const weightTrend = recentMeasurements.map((m: any) => `${m.date}: ${m.weight_kg}kg`).join(', ')

    const prompt = planType === 'diet'
      ? `You are Ion, an AI personal trainer. Generate an updated 4-week diet plan for this user based on their progress.

User: ${profile.name}, ${profile.age}yr, ${profile.gender}
Goal: ${profile.goal}
Current weight trend: ${weightTrend || 'No recent data'}
Daily calories: ${profile.goal === 'lose_weight' ? 'slight deficit' : profile.goal === 'gain_muscle' ? 'surplus' : 'maintenance'}
Dietary preference: ${profile.dietary_preference}
Meals per day: ${profile.meals_per_day}
Allergies: ${profile.allergies || 'none'}

Generate a refreshed diet plan as JSON. Return ONLY valid JSON with this structure:
{
  "name": "Plan name",
  "daily_calories": number,
  "macros": { "protein_g": number, "carbs_g": number, "fat_g": number },
  "hydration_liters": number,
  "weeks": [
    {
      "week": 1,
      "days": [
        {
          "day_name": "Monday",
          "total_calories": number,
          "meals": [
            {
              "meal_name": "Breakfast",
              "time": "7:00 AM",
              "calories": number,
              "protein_g": number,
              "foods": [{"name": "food", "amount": "quantity"}],
              "recipe": {
                "title": "Simple recipe name",
                "prep_time_min": number,
                "cook_time_min": number,
                "ingredients": ["Ingredient with exact amount from foods list"],
                "steps": ["Short practical cooking step 1", "Short practical cooking step 2", "Short practical cooking step 3"],
                "tips": "One helpful cooking or meal-prep tip"
              }
            }
          ]
        }
      ]
    }
  ],
  "notes": "Ion's coaching note"
}`
      : `You are Ion, an AI personal trainer. Generate an updated 6-week progressive workout plan for this user.

User: ${profile.name}, ${profile.age}yr, ${profile.gender}
Goal: ${profile.goal}
Equipment: ${profile.gym_access ? 'Full gym' : profile.equipment || 'Home'}
Sessions per week: ${profile.training_days}
Duration: ${profile.session_duration} min
Experience: intermediate (has been training)

Generate a progressive workout plan as JSON. Return ONLY valid JSON:
{
  "name": "Plan name",
  "days_per_week": number,
  "session_duration_min": number,
  "split_type": "push_pull_legs|upper_lower|full_body",
  "level": "intermediate",
  "progressive_overload": "overload strategy",
  "weeks": [
    {
      "week": 1,
      "focus": "Foundation",
      "days": [
        {
          "day_name": "Monday",
          "muscle_focus": "Chest & Triceps",
          "duration_min": number,
          "exercises": [
            {
              "name": "Bench Press",
              "sets": 4,
              "reps": "8-10",
              "rest_sec": 90,
              "muscle_group": "Chest",
              "form_tip": "tip",
              "weight_guidance": "guidance"
            }
          ]
        }
      ]
    }
  ],
  "notes": "Ion's note"
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
    const planJson = JSON.parse(match[0])

    // Enrich workout exercises with verified YouTube video IDs
    if (planType === 'workout') {
      const allExercises: any[] = (planJson.days || planJson.weeks?.flatMap((w: any) => w.days) || [])
        .flatMap((day: any) => day.exercises || [])
      await Promise.all(
        allExercises.map(async (ex: any) => {
          try {
            ex.video_id = await Promise.race([
              resolveExerciseVideo(ex.name),
              new Promise<null>(res => setTimeout(() => res(null), 10_000)),
            ])
          } catch { ex.video_id = null }
        })
      )
    }

    const table = planType === 'diet' ? 'diet_plans' : 'workout_plans'
    const durationWeeks = planType === 'diet' ? 4 : 6

    // Deactivate old plan
    await supabase.from(table).update({ active: false }).eq('user_id', user.id).eq('active', true)

    // Insert new plan
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString().split('T')[0]

    await supabase.from(table).insert({
      user_id: user.id,
      plan_json: planJson,
      active: true,
      start_date: startDate,
      end_date: endDate,
    })

    // Ion chat message
    const ionMessage = planType === 'diet'
      ? `Your new ${durationWeeks}-week diet plan is live, ${profile.name}. I've adjusted the calories and macros based on your recent progress. Check My Plan to see what's changed.`
      : `New workout programme unlocked, ${profile.name}. I've increased the intensity and adjusted exercises based on your training over the last ${durationWeeks} weeks. Time to level up.`

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'ion',
      content: ionMessage,
      message_type: 'new_plan',
    })

    // Notifications
    await Promise.allSettled([
      sendEmail({ to: user.email!, type: 'new_plan', data: { name: profile.name, planType, weeks: durationWeeks } }),
      sendPushNotification({ userId: user.id, type: 'plan_renewal' }),
    ])

    // ── Supplement recommendations for Elite users ────────────
    // Fire-and-forget — don't block plan renewal response
    generateSupplementRecsIfElite(supabase, client, user.id, profile, planJson, planType).catch(
      e => console.error('[renew-plan] supplement gen failed:', e)
    )

    return NextResponse.json({ ok: true, plan: planJson })
  } catch (err: any) {
    console.error('[renew-plan]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Supplement Recommendations (Elite only) ───────────────────────────────────
async function generateSupplementRecsIfElite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  client: Anthropic,
  userId: string,
  profile: any,
  planJson: any,
  planType: 'diet' | 'workout',
) {
  // Check Elite status
  const sub = await getUserSubscription(userId)
  const plan = effectivePlan(sub)
  if (plan !== 'elite') return

  // Count existing cycles so we can number this one
  const { count } = await supabase
    .from('supplement_recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  const cycleNumber = (count ?? 0) + 1

  // Build context from the new plan
  const dietContext = planType === 'diet'
    ? `Daily calories: ${planJson.daily_calories}, Protein: ${planJson.macros?.protein_g}g, Carbs: ${planJson.macros?.carbs_g}g, Fat: ${planJson.macros?.fat_g}g. Dietary preference: ${profile.dietary_preference || 'balanced'}. Allergies: ${profile.allergies || 'none'}.`
    : `No new diet plan — using existing nutrition. Dietary preference: ${profile.dietary_preference || 'balanced'}.`

  const workoutContext = planType === 'workout'
    ? `New ${planJson.weeks?.length || 6}-week ${planJson.split_type?.replace(/_/g, ' ') || 'training'} programme. ${planJson.days_per_week} sessions/week, ${planJson.session_duration_min} min each. Progressive overload: ${planJson.progressive_overload || 'standard'}.`
    : `Using existing workout plan.`

  const prompt = `You are Ion, an elite AI personal trainer and sports nutritionist. Based on this user's new plan cycle, recommend a precise, evidence-based supplement stack.

USER:
Name: ${profile.name}, ${profile.age}yr ${profile.gender}
Goal: ${profile.goal}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm

NUTRITION CONTEXT:
${dietContext}

TRAINING CONTEXT:
${workoutContext}

Generate personalised supplement recommendations as JSON. Return ONLY valid JSON:
{
  "headline": "One-line summary of the stack rationale",
  "supplements": [
    {
      "name": "Supplement name",
      "category": "Performance|Recovery|Health|Cognition",
      "dose": "Exact dose (e.g. 5g, 200mg)",
      "timing": "When to take (e.g. Pre-workout, Post-workout, Morning with food)",
      "benefit": "Specific benefit for this user's goal and plan",
      "evidence": "strong|moderate|emerging",
      "priority": "essential|recommended|optional",
      "notes": "Any important interactions, cycling advice, or food sources if preferred over supplements"
    }
  ],
  "stack_notes": "Ion's overall coaching note about this supplement stack — 2-3 sentences max",
  "cycle": ${cycleNumber}
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as any).text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Failed to parse supplement recommendations JSON')
  const recommendations = JSON.parse(match[0])

  await supabase.from('supplement_recommendations').insert({
    user_id:         userId,
    cycle_number:    cycleNumber,
    recommendations: recommendations,
    generated_at:    new Date().toISOString(),
  })
}
