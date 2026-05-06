import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canSendMessage, incrementMessageCount, isLaunchMode } from '@/lib/subscription'
import { resolveExerciseVideo } from '@/lib/youtube-search'

export async function POST(req: Request) {
  // ── Guard: API key must be set ─────────────────────────
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
    const supabase = createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Check message limits (skip in launch mode) ────────
    if (!isLaunchMode()) {
      const { allowed, used, limit, plan } = await canSendMessage(user.id)

      if (!allowed) {
        const planLabel = plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1)
        const limitLabel = limit === Infinity ? 'unlimited' : String(limit)
        return NextResponse.json({
          error: `daily_limit_reached`,
          message: `You've used all ${limitLabel} messages today on the ${planLabel} plan. Upgrade for more.`,
          used,
          limit,
          plan,
        }, { status: 429 })
      }
    }

    // Load user profile + active plans for context
    const [profileRes, workoutRes, dietRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('chat_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    const profile = profileRes.data
    const workoutPlan = workoutRes.data?.plan_json
    const dietPlan = dietRes.data?.plan_json
    // Reverse to get chronological order
    const history = (historyRes.data || []).reverse()

    // Save user message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
      message_type: 'text',
    })

    const systemPrompt = buildSystemPrompt(profile, workoutPlan, dietPlan)

    // Build conversation history — Anthropic only accepts 'user' | 'assistant'
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

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

    // ── Increment message count (skip in launch mode) ─────
    if (!isLaunchMode()) {
      await incrementMessageCount(user.id).catch(() => {})
    }

    return NextResponse.json({ reply, message_type: messageType, plan_edit: planEdit.applied ? planEdit : null })
  } catch (err: any) {
    console.error('Chat error:', err?.message || err)
    const friendly = friendlyError(err?.message || '')
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}

function friendlyError(raw: string): string {
  if (raw.includes('credit balance') || raw.includes('billing') || raw.includes('quota')) {
    return "I'm temporarily unavailable. Please try again in a moment."
  }
  if (raw.includes('overloaded') || raw.includes('529') || raw.includes('rate_limit')) {
    return "I'm a bit busy right now. Give me a second and try again."
  }
  if (raw.includes('invalid_api_key') || raw.includes('authentication')) {
    return "I'm having a configuration issue. Please contact support."
  }
  if (raw.includes('context_length') || raw.includes('too long')) {
    return "That message is too long for me. Can you shorten it?"
  }
  return "Something went wrong on my end. Try again in a moment."
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
  supabase: ReturnType<typeof createServerClient>
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

    const editResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: intent === 'workout' ? 5000 : 3500,
      messages: [{ role: 'user', content: prompt }],
    })

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
  const profileText = profile ? `Name: ${profile.name}
Goal: ${profile.goal}
Training days: ${profile.training_days}
Gym access: ${profile.gym_access}
Injuries: ${profile.injuries || 'None'}
Medical: ${profile.medical_conditions || 'None'}
Dietary: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'None'}
Allergies: ${profile.allergies || 'None'}` : 'No profile loaded'

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

function buildSystemPrompt(profile: any, workoutPlan: any, dietPlan: any): string {
  return `You are Ion, an elite AI personal trainer and coach for SYNAP. You are talking to ${profile?.name || 'your client'}.

YOUR PERSONALITY:
- Direct, confident, and genuinely encouraging — like a real coach
- You know the science but speak like a human, not a textbook
- You hold people accountable with warmth
- Short, punchy responses unless a detailed answer is truly needed
- Use the person's name naturally

CLIENT PROFILE:
${profile ? `Name: ${profile.name}, Age: ${profile.age}, Gender: ${profile.gender}
Goal: ${profile.goal} | Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Training days: ${profile.training_days}/week | Gym access: ${profile.gym_access}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Dietary: ${profile.dietary_preference?.join(', ') || 'No restrictions'}` : 'No profile loaded yet — introduce yourself and ask them to complete onboarding'}

THEIR CURRENT WORKOUT PLAN:
${workoutPlan ? JSON.stringify(workoutPlan, null, 2).slice(0, 1500) : 'No plan yet — encourage them to generate one'}

THEIR CURRENT DIET PLAN:
${dietPlan ? `Daily targets: ${dietPlan.daily_calories} kcal, ${dietPlan.protein_g}g protein, ${dietPlan.carbs_g}g carbs, ${dietPlan.fat_g}g fat` : 'No plan yet'}

RULES:
- Never give generic advice — always reference their specific situation
- If asked to modify workouts or nutrition, make the change directly and describe what changed clearly
- For medical questions, recommend consulting a doctor first
- Keep responses focused and conversational (2-4 sentences usually)
- If they're struggling, be encouraging but realistic`
}
