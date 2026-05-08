import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canSendMessage, incrementMessageCount, isLaunchMode, getUserSubscription, effectivePlan } from '@/lib/subscription'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry, anthropicFriendlyError } from '@/lib/anthropic'

export async function POST(req: Request) {
  // Guard: API key must be set
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    return NextResponse.json(
      { error: 'Ion is not configured yet. The ANTHROPIC_API_KEY environment variable is missing.' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey })

  try {
    const { message } = await req.json()
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check message limits (skip in launch mode)
    if (!isLaunchMode()) {
      const { allowed, used, limit, plan, reason } = await canSendMessage(user.id, user.created_at)

      if (!allowed) {
        if (reason === 'starter_expired') {
          return NextResponse.json({
            error: 'starter_expired',
            message: "Your 7-day free trial has ended. Upgrade to Pro or Elite to keep chatting with Ion.",
            used,
            limit,
            plan,
          }, { status: 429 })
        }

        const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
        const limitLabel = limit === Infinity ? 'unlimited' : String(limit)
        return NextResponse.json({
          error: 'daily_limit_reached',
          message: `You've used all ${limitLabel} messages today on the ${planLabel} plan. Upgrade for unlimited messages.`,
          used,
          limit,
          plan,
        }, { status: 429 })
      }
    }

    // Load user profile + plans + context in parallel
    const [profileRes, workoutRes, dietRes, historyRes, subRes, measureRes, workoutLogRes, mealLogRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('chat_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      getUserSubscription(user.id),
      // Latest 3 measurements
      supabase.from('measurements').select('date,weight_kg,body_fat_pct,waist_cm,chest_cm,hips_cm,bicep_left_cm,bicep_right_cm,thigh_left_cm,thigh_right_cm')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(3),
      // Last 7 workout logs
      supabase.from('workout_log').select('date,day_name,completion_pct,duration_min,exercises_completed')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
      // Last 7 meal logs
      supabase.from('meals_log').select('date,meal_time,description,calories_estimated,protein_g,carbs_g,fats_g')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    ])

    const profile     = profileRes.data
    const workoutPlan = workoutRes.data?.plan_json
    const dietPlan    = dietRes.data?.plan_json
    const planTier    = effectivePlan(subRes)
    const measurements = measureRes.data || []
    const workoutLogs  = workoutLogRes.data || []
    const mealLogs     = mealLogRes.data || []

    // Reverse to get chronological order
    const history = (historyRes.data || []).reverse()

    // Save user message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      message_type: 'text',
    })

    const systemPrompt = buildSystemPrompt(profile, workoutPlan, dietPlan, planTier, measurements, workoutLogs, mealLogs)

    // Build conversation history. Anthropic only accepts 'user' | 'assistant'.
    const normalizedHistory: Anthropic.MessageParam[] = history
      .filter(h => h.role === 'user' || h.role === 'assistant' || h.role === 'ion')
      .map(h => ({
        role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.content,
      }))

    const messages: Anthropic.MessageParam[] = [
      ...normalizedHistory,
      { role: 'user', content: message },
    ]

    const response = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }))

    let reply = response.content[0].type === 'text' ? response.content[0].text : ''
    let messageType = 'text'

    const planEdit = await maybeApplyPlanEdit({
      client,
      supabase,
      userId: user.id,
      profile,
      message,
      workoutPlan,
      dietPlan,
    })

    if (planEdit.applied) {
      messageType = planEdit.type === 'workout' ? 'workout_card' : 'meal_card'
      reply = `${reply}\n\nDone - I updated your ${planEdit.type === 'workout' ? 'workout plan' : 'nutrition plan'} and saved it to your current plan. ${planEdit.summary}`
    }

    // Save assistant response
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: reply,
      message_type: messageType,
      metadata: planEdit.applied ? { plan_edit: planEdit } : null,
    })

    if (!isLaunchMode()) {
      await incrementMessageCount(user.id).catch(() => {})
    }

    return NextResponse.json({ reply, message_type: messageType, plan_edit: planEdit.applied ? planEdit : null })
  } catch (err: any) {
    console.error('Chat error:', err?.status, err?.error?.type, err?.message)
    return NextResponse.json({ error: anthropicFriendlyError(err) }, { status: 500 })
  }
}

type PlanEditResult =
  | { applied: false; reason: string }
  | { applied: true; type: 'workout' | 'diet'; summary: string }

async function maybeApplyPlanEdit({
  client,
  supabase,
  userId,
  profile,
  message,
  workoutPlan,
  dietPlan,
}: {
  client: Anthropic
  supabase: Awaited<ReturnType<typeof createServerClient>>
  userId: string
  profile: any
  message: string
  workoutPlan: any
  dietPlan: any
}): Promise<PlanEditResult> {
  const intent = detectPlanEditIntent(message)
  if (!intent) return { applied: false, reason: 'no_plan_edit_intent' }
  if (intent === 'workout' && !workoutPlan) return { applied: false, reason: 'no_active_workout_plan' }
  if (intent === 'diet' && !dietPlan) return { applied: false, reason: 'no_active_diet_plan' }

  try {
    const currentPlan = intent === 'workout' ? workoutPlan : dietPlan
    const prompt = buildPlanEditPrompt({
      type: intent,
      profile,
      userRequest: message,
      currentPlan,
    })

    const editResponse = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: intent === 'workout' ? 10000 : 6000,
      messages: [{ role: 'user', content: prompt }],
    }))

    const raw = editResponse.content[0].type === 'text' ? editResponse.content[0].text : ''
    const edit = parseJsonObject(raw)
    if (!edit?.updated_plan || typeof edit.summary !== 'string') {
      return { applied: false, reason: 'invalid_plan_edit_response' }
    }

    if (intent === 'workout') {
      await enrichWorkoutVideos(edit.updated_plan)
      await supabase.from('workout_plans').update({ active: false }).eq('user_id', userId).eq('active', true)
      const { error } = await supabase.from('workout_plans').insert({
        user_id: userId,
        plan_json: edit.updated_plan,
        active: true,
      })
      if (error) throw error
    } else {
      await supabase.from('diet_plans').update({ active: false }).eq('user_id', userId).eq('active', true)
      const { error } = await supabase.from('diet_plans').insert({
        user_id: userId,
        plan_json: edit.updated_plan,
        active: true,
      })
      if (error) throw error
    }

    return {
      applied: true,
      type: intent,
      summary: edit.summary.slice(0, 500),
    }
  } catch (err) {
    console.error('Plan edit failed:', err)
    return { applied: false, reason: 'plan_edit_failed' }
  }
}

function detectPlanEditIntent(message: string): 'workout' | 'diet' | null {
  const text = message.toLowerCase()
  const changeWords = /\b(change|swap|replace|remove|avoid|hate|dislike|allergic|allergy|can't eat|cannot eat|adjust|update|modify|instead|alternative)\b/
  if (!changeWords.test(text)) return null

  const workoutWords = /\b(exercise|workout|training|lift|bench|squat|deadlift|cardio|sets|reps|gym|machine|dumbbell|barbell|shoulder|knee|back pain)\b/
  const dietWords = /\b(food|meal|diet|nutrition|calorie|calories|macro|protein|carb|fat|breakfast|lunch|dinner|snack|chicken|rice|egg|milk|fish|beef|vegetarian|vegan)\b/

  if (workoutWords.test(text) && !dietWords.test(text)) return 'workout'
  if (dietWords.test(text) && !workoutWords.test(text)) return 'diet'
  if (/\b(exercise|workout|training|gym)\b/.test(text)) return 'workout'
  if (/\b(food|meal|diet|nutrition|calorie|macro)\b/.test(text)) return 'diet'
  return null
}

function buildPlanEditPrompt({
  type,
  profile,
  userRequest,
  currentPlan,
}: {
  type: 'workout' | 'diet'
  profile: any
  userRequest: string
  currentPlan: any
}) {
  const profileText = profile ? `Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Goal: ${profile.goal}${profile.goal_target ? ` (target: ${profile.goal_target})` : ''}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Training days: ${profile.training_days}/week | Gym access: ${profile.gym_access ? 'Yes' : 'No'} | Equipment: ${Array.isArray(profile.equipment) ? profile.equipment.join(', ') : 'Not specified'}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Dietary: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'None'}
Allergies: ${profile.allergies || 'None'}
Foods loved: ${profile.foods_loved || 'Not specified'} | Foods hated: ${profile.foods_hated || 'Not specified'}
Exercises hated: ${profile.exercises_hated || 'None'}` : 'No profile loaded'

  return `You are Ion, a careful personal trainer and nutrition coach. The user is asking to change their active ${type === 'workout' ? 'workout' : 'nutrition'} plan.

USER PROFILE:
${profileText}

USER REQUEST:
${userRequest}

CURRENT ACTIVE PLAN JSON:
${JSON.stringify(currentPlan, null, 2)}

TASK:
- Return the full updated plan JSON, preserving the same overall shape and all useful existing fields.
- Make only the requested change plus directly necessary balancing changes.
- If this is a workout plan, keep exercise objects complete: name, sets, reps, rest_sec, weight_guidance, form_tip, muscle_group when present.
- If replacing an exercise, choose a safe equivalent for the same muscle group and the user's equipment/injuries.
- If this is a diet plan, keep daily calories/macros coherent and meal totals roughly aligned.
- If this is a diet plan, every meal must include a practical recipe object with title, prep_time_min, cook_time_min, ingredients, steps, and tips.
- Do not include markdown or explanations outside JSON.

Return ONLY valid JSON in this exact wrapper:
{
  "summary": "1 sentence explaining what changed",
  "updated_plan": { ...full updated plan... }
}`
}

function parseJsonObject(raw: string): any | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : cleaned)
  } catch {
    return null
  }
}

async function enrichWorkoutVideos(plan: any) {
  const allExercises: any[] = getWorkoutDays(plan).flatMap((day: any) => day.exercises || [])
  await Promise.all(
    allExercises.map(async (ex: any) => {
      try {
        ex.video_id = await Promise.race([
          resolveExerciseVideo(ex.name, ex.video_id),
          new Promise<null>(res => setTimeout(() => res(null), 10_000)),
        ])
      } catch {
        ex.video_id = null
      }
    })
  )
}

function getWorkoutDays(plan: any): any[] {
  if (Array.isArray(plan?.days)) return plan.days
  if (Array.isArray(plan?.weeks)) return plan.weeks.flatMap((week: any) => week.days || [])
  return []
}

function buildSystemPrompt(
  profile: any,
  workoutPlan: any,
  dietPlan: any,
  planTier: string,
  measurements: any[],
  workoutLogs: any[],
  mealLogs: any[],
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const profileBlock = profile ? `
Name: ${profile.name}
Age: ${profile.age} | Gender: ${profile.gender}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Goal: ${profile.goal}${profile.goal_target ? ` (target: ${profile.goal_target})` : ''}${profile.goal_date ? ` by ${profile.goal_date}` : ''}
Training: ${profile.training_days} days/week | ${profile.gym_access ? 'Has gym access' : 'Home training'}${profile.session_duration ? ` | ${profile.session_duration} min sessions` : ''}
Experience: ${profile.training_experience || 'Not specified'} | Style: ${profile.training_style || 'Not specified'}
Wake: ${profile.wake_time || '?'} | Sleep: ${profile.sleep_time || '?'} | Work schedule: ${profile.work_schedule || 'Not specified'}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Diet: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'No restrictions'}
Allergies: ${profile.allergies || 'None'}
Foods loved: ${profile.foods_loved || 'Not specified'} | Foods hated: ${profile.foods_hated || 'Not specified'}
Meals/day: ${profile.meals_per_day || 'Not specified'} | Cooking: ${profile.cooking_ability || 'Not specified'} | Budget: ${profile.food_budget || 'Not specified'}
Supplements: ${Array.isArray(profile.supplements) ? profile.supplements.join(', ') : profile.supplements || 'None'}
Exercises hated: ${profile.exercises_hated || 'None'}
Stress: ${profile.stress_level || 'Not specified'} | Sleep quality: ${profile.sleep_quality || 'Not specified'}
Activity level: ${profile.activity_level || 'Not specified'}
`.trim() : 'No profile loaded yet - introduce yourself and ask them to complete onboarding.'

  const measureBlock = measurements.length > 0
    ? measurements.map(m => `${m.date}: ${m.weight_kg}kg${m.body_fat_pct ? `, ${m.body_fat_pct}% BF` : ''}${m.waist_cm ? `, waist ${m.waist_cm}cm` : ''}${m.chest_cm ? `, chest ${m.chest_cm}cm` : ''}${m.hips_cm ? `, hips ${m.hips_cm}cm` : ''}${m.bicep_left_cm ? `, L-bicep ${m.bicep_left_cm}cm` : ''}${m.bicep_right_cm ? ` R-bicep ${m.bicep_right_cm}cm` : ''}${m.thigh_left_cm ? `, L-thigh ${m.thigh_left_cm}cm` : ''}${m.thigh_right_cm ? ` R-thigh ${m.thigh_right_cm}cm` : ''}`).join('\n')
    : 'No measurements recorded yet.'

  const workoutLogBlock = workoutLogs.length > 0
    ? workoutLogs.map(l => `${l.date}${l.day_name ? ` (${l.day_name})` : ''}: ${l.completion_pct ?? '?'}% complete${l.duration_min ? `, ${l.duration_min} min` : ''}`).join('\n')
    : 'No recent workout logs.'

  const mealLogBlock = mealLogs.length > 0
    ? mealLogs.map(l => `${l.date} ${l.meal_time || ''}: ${l.description || 'logged'}${l.calories_estimated ? ` (~${l.calories_estimated} kcal` : ''}${l.protein_g ? `, ${l.protein_g}g protein` : ''}${l.calories_estimated ? ')' : ''}`).join('\n')
    : 'No recent meal logs.'

  const dietBlock = dietPlan
    ? `Daily targets: ${dietPlan.daily_calories} kcal | ${dietPlan.protein_g}g protein | ${dietPlan.carbs_g}g carbs | ${dietPlan.fat_g}g fat`
    : 'No diet plan yet.'

  const workoutBlock = workoutPlan
    ? JSON.stringify(workoutPlan, null, 2).slice(0, 2000)
    : 'No workout plan yet - encourage them to generate one.'

  return `You are Ion, an elite AI personal trainer and nutrition coach for SYNAP. You speak directly to ${profile?.name || 'your client'}.

TODAY: ${dateStr}
CLIENT TIER: ${planTier.toUpperCase()} plan

=== CLIENT PROFILE ===
${profileBlock}

=== LATEST BODY MEASUREMENTS ===
${measureBlock}

=== RECENT WORKOUT LOGS (last 7) ===
${workoutLogBlock}

=== RECENT MEAL LOGS (last 7) ===
${mealLogBlock}

=== ACTIVE DIET PLAN TARGETS ===
${dietBlock}

=== ACTIVE WORKOUT PLAN ===
${workoutBlock}

=== YOUR ROLE & BEHAVIOUR ===
- You are a real coach: direct, confident, warm - not a chatbot reciting facts
- You ALWAYS personalise your response using the data above - never give generic advice
- Use the client's name naturally, reference their specific plan, logs, and measurements
- Short punchy responses (2-4 sentences) unless detailed analysis is genuinely needed
- If you notice something in their logs or measurements (plateau, imbalance, missed sessions, macros off) - call it out proactively
- If asked to modify their plan, detect the intent and make the change directly
- For medical questions, recommend a doctor first but still be helpful with what you can
- If they're struggling, be encouraging but honest - no empty hype
- You speak Arabic fluently - reply in the same language the user writes in
- Do NOT mention your tier or pricing - that's handled elsewhere`
}

