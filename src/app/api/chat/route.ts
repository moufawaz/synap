import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canSendMessage, incrementMessageCount, isLaunchMode, getUserSubscription, effectivePlan } from '@/lib/subscription'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry, anthropicFriendlyError } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 120), 1), 300)
  const admin = createAdminClient()

  const [profileRes, historyRes, planRes] = await Promise.all([
    admin.from('profiles').select('gender').eq('user_id', user.id).maybeSingle(),
    admin.from('chat_messages')
      .select('id, role, content, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .in('role', ['user', 'assistant', 'ion'])
      .order('created_at', { ascending: false })
      .limit(limit),
    admin.from('workout_plans')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return NextResponse.json({
    profile: profileRes.data ?? null,
    messages: (historyRes.data ?? []).reverse(),
    activeWorkoutPlan: planRes.data ?? null,
  })
}

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
    const [profileRes, userLangRes, workoutRes, dietRes, historyRes, subRes, measureRes, workoutLogRes, mealLogRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('users').select('language').eq('id', user.id).maybeSingle(),
      supabase.from('workout_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).single(),
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

    const profile     = profileRes.data ? { ...profileRes.data, language: userLangRes.data?.language ?? profileRes.data.language } : null
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

    const planEdit = await maybeApplyPlanEdit({
      client,
      supabase,
      userId: user.id,
      profile,
      message,
      workoutPlanRow: workoutRes.data,
      dietPlanRow: dietRes.data,
    })

    if (planEdit.applied || planEdit.shouldStop) {
      const reply = planEdit.applied
        ? buildPlanEditReply(profile, planEdit)
        : buildPlanEditFailureReply(profile, planEdit.reason)
      const messageType = planEdit.applied
        ? (planEdit.type === 'workout' ? 'workout_card' : 'meal_card')
        : 'alert'

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: reply,
        message_type: messageType,
        metadata: {
          ...(planEdit.applied ? { plan_edit: planEdit } : { plan_edit_error: planEdit.reason }),
          total_estimated_cost_usd: planEdit.applied ? planEdit.usage.estimated_cost_usd : 0,
        },
      })

      if (!isLaunchMode()) {
        await incrementMessageCount(user.id).catch(() => {})
      }

      return NextResponse.json({
        reply,
        message_type: messageType,
        plan_edit: planEdit.applied ? { type: planEdit.type, summary: planEdit.summary } : null,
      })
    }

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

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    const messageType = 'text'

    // Save assistant response
    const usageMetadata = {
      model: response.model,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens || 0,
      estimated_cost_usd: estimateAnthropicCostUsd(response.usage, response.model),
    }
    await recordAiUsage({
      userId: user.id,
      feature: 'ion_chat',
      model: response.model,
      usage: response.usage,
    })
    const totalEstimatedCostUsd = usageMetadata.estimated_cost_usd

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: reply,
      message_type: messageType,
      metadata: {
        usage: usageMetadata,
        total_estimated_cost_usd: totalEstimatedCostUsd,
      },
    })

    if (!isLaunchMode()) {
      await incrementMessageCount(user.id).catch(() => {})
    }

    return NextResponse.json({
      reply,
      message_type: messageType,
      plan_edit: null,
    })
  } catch (err: any) {
    console.error('Chat error:', err?.status, err?.error?.type, err?.message)
    return NextResponse.json({ error: anthropicFriendlyError(err) }, { status: 500 })
  }
}

type PlanEditResult =
  | { applied: false; shouldStop: false; reason: string }
  | { applied: false; shouldStop: true; reason: string }
  | { applied: true; shouldStop: true; type: 'workout' | 'diet'; summary: string; usage: { model: string; input_tokens: number; output_tokens: number; estimated_cost_usd: number } }

type PlanEditIntent = 'workout' | 'diet' | 'rest_today'

async function maybeApplyPlanEdit({
  client,
  supabase,
  userId,
  profile,
  message,
  workoutPlanRow,
  dietPlanRow,
}: {
  client: Anthropic
  supabase: Awaited<ReturnType<typeof createServerClient>>
  userId: string
  profile: any
  message: string
  workoutPlanRow: any
  dietPlanRow: any
}): Promise<PlanEditResult> {
  const intent = detectPlanEditIntent(message)
  if (!intent) return { applied: false, shouldStop: false, reason: 'no_plan_edit_intent' }
  if ((intent === 'workout' || intent === 'rest_today') && !workoutPlanRow?.plan_json) {
    return { applied: false, shouldStop: true, reason: 'no_active_workout_plan' }
  }
  if (intent === 'diet' && !dietPlanRow?.plan_json) {
    return { applied: false, shouldStop: true, reason: 'no_active_diet_plan' }
  }

  try {
    if (intent === 'rest_today') {
      const result = applyRestDayToday(workoutPlanRow.plan_json, message)
      const { error } = await supabase
        .from('workout_plans')
        .update({ plan_json: result.plan })
        .eq('id', workoutPlanRow.id)
        .eq('user_id', userId)
      if (error) throw error

      return {
        applied: true,
        shouldStop: true,
        type: 'workout',
        summary: result.summary,
        usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
      }
    }

    const currentPlan = intent === 'workout' ? workoutPlanRow.plan_json : dietPlanRow.plan_json
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
      return { applied: false, shouldStop: true, reason: 'invalid_plan_edit_response' }
    }

    if (intent === 'workout') {
      await enrichWorkoutVideos(edit.updated_plan)
      const { error } = await supabase
        .from('workout_plans')
        .update({ plan_json: edit.updated_plan })
        .eq('id', workoutPlanRow.id)
        .eq('user_id', userId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('diet_plans')
        .update({ plan_json: edit.updated_plan })
        .eq('id', dietPlanRow.id)
        .eq('user_id', userId)
      if (error) throw error
    }

    await recordAiUsage({
      userId,
      feature: `plan_edit_${intent}`,
      model: editResponse.model,
      usage: editResponse.usage,
    })

    return {
      applied: true,
      shouldStop: true,
      type: intent,
      summary: edit.summary.slice(0, 500),
      usage: {
        model: editResponse.model,
        input_tokens: editResponse.usage.input_tokens,
        output_tokens: editResponse.usage.output_tokens,
        estimated_cost_usd: estimateAnthropicCostUsd(editResponse.usage, editResponse.model),
      },
    }
  } catch (err) {
    console.error('Plan edit failed:', err)
    return { applied: false, shouldStop: true, reason: 'plan_edit_failed' }
  }
}

function detectPlanEditIntent(message: string): PlanEditIntent | null {
  const text = message.toLowerCase()
  const hasArabic = /[\u0600-\u06FF]/.test(message)
  const restTodayWords = /\b(rest day|take a rest|rest today|skip today|day off|move today|reschedule today|postpone today|recover today)\b|راحة|استراحة|ارتاح|ريست|أجل|اجل|انقل.*اليوم|راحة اليوم/
  if (restTodayWords.test(text)) return 'rest_today'

  const changeWords = /\b(change|swap|replace|remove|avoid|hate|dislike|allergic|allergy|can't eat|cannot eat|adjust|update|modify|instead|alternative|increase|decrease|raise|lower|more|less|reduce|add)\b|غير|غيّر|بدل|استبدل|احذف|شيل|عدل|عدّل|تعديل|تحديث|زود|قلل|أضف|اضف|حساسية|ما اقدر|ما أقدر|لا أستطيع|بديل/
  if (!changeWords.test(text)) return null

  const workoutWords = /\b(exercise|workout|training|lift|bench|squat|deadlift|cardio|sets|reps|gym|machine|dumbbell|barbell|shoulder|knee|back pain|leg|chest|back|biceps|triceps)\b|تمرين|تمارين|تدريب|جيم|سكوات|بنش|ديدلفت|كارديو|مجموعات|تكرارات|كتف|ركبة|ظهر|صدر|رجل|بايسبس|ترايسبس/
  const dietWords = /\b(food|meal|diet|nutrition|calorie|calories|macro|protein|carb|fat|breakfast|lunch|dinner|snack|chicken|rice|egg|milk|fish|beef|vegetarian|vegan|oats|bread)\b|أكل|اكل|وجبة|وجبات|غذاء|تغذية|سعرات|سعرة|بروتين|كارب|كربوهيدرات|دهون|فطور|غداء|عشاء|سناك|دجاج|رز|أرز|بيض|حليب|سمك|لحم|شوفان|خبز/

  if (workoutWords.test(text) && !dietWords.test(text)) return 'workout'
  if (dietWords.test(text) && !workoutWords.test(text)) return 'diet'
  if (/\b(exercise|workout|training|gym)\b|تمرين|تدريب|جيم/.test(text)) return 'workout'
  if (/\b(food|meal|diet|nutrition|calorie|macro)\b|أكل|اكل|وجبة|غذاء|تغذية|سعرات/.test(text)) return 'diet'
  if (hasArabic) return null
  return null
}

function buildPlanEditReply(profile: any, edit: Extract<PlanEditResult, { applied: true }>) {
  const ar = profile?.language === 'ar'
  if (ar) {
    return edit.type === 'workout'
      ? `تم. حدّثت خطة التمرين وحفظتها في صفحات التمرين. ${edit.summary}`
      : `تم. حدّثت خطة التغذية وحفظتها في صفحة التغذية. ${edit.summary}`
  }
  return edit.type === 'workout'
    ? `Done. I updated your workout plan and saved it to your workout pages. ${edit.summary}`
    : `Done. I updated your nutrition plan and saved it to your nutrition page. ${edit.summary}`
}

function buildPlanEditFailureReply(profile: any, reason: string) {
  const ar = profile?.language === 'ar'
  if (reason === 'no_active_workout_plan') {
    return ar
      ? 'لا توجد خطة تمرين نشطة لتعديلها الآن. أكمل إنشاء الخطة أولاً ثم أستطيع تعديلها مباشرة.'
      : 'You do not have an active workout plan to edit yet. Generate your plan first, then I can update it directly.'
  }
  if (reason === 'no_active_diet_plan') {
    return ar
      ? 'لا توجد خطة تغذية نشطة لتعديلها الآن. أكمل إنشاء الخطة أولاً ثم أستطيع تعديلها مباشرة.'
      : 'You do not have an active nutrition plan to edit yet. Generate your plan first, then I can update it directly.'
  }
  return ar
    ? 'حاولت تعديل الخطة، لكن لم أستطع حفظ التغيير بشكل آمن. اكتب التغيير بشكل أوضح مثل: “بدّل تمرين السكوات” أو “اجعل اليوم راحة”.'
    : 'I tried to update the plan, but I could not save the change safely. Try a clearer request like “swap squats” or “make today a rest day.”'
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function dayNameOf(day: any) {
  return String(day?.day_name ?? day?.day ?? '').trim()
}

function setDayName(day: any, name: string) {
  if ('day_name' in day || !('day' in day)) day.day_name = name
  if ('day' in day) day.day = name
}

function applyRestDayToday(currentPlan: any, request: string) {
  const plan = cloneJson(currentPlan)
  const today = DAY_NAMES[new Date().getDay()]
  const todayIndex = DAY_NAMES.indexOf(today)
  const adjustment = {
    date: new Date().toISOString(),
    type: 'rest_day_today',
    request,
    note: `Ion moved ${today}'s workout so today is a rest day.`,
  }

  const topLevelDays = Array.isArray(plan.days) ? plan.days : null
  const topResult = topLevelDays ? moveWorkoutOffDay(topLevelDays, today, todayIndex) : null

  if (Array.isArray(plan.weeks)) {
    plan.weeks = plan.weeks.map((week: any) => {
      if (!Array.isArray(week.days)) return week
      const result = moveWorkoutOffDay(week.days, today, todayIndex)
      return { ...week, days: result.days }
    })
  }

  if (topResult) plan.days = topResult.days
  plan.ion_adjustments = [
    ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
    adjustment,
  ]

  const movedTo = topResult?.movedTo ?? null
  return {
    plan,
    summary: movedTo
      ? `Today is now a rest day. I moved today's workout to ${movedTo}.`
      : `Today is now a rest day. Resume with your next scheduled workout day.`,
  }
}

function moveWorkoutOffDay(days: any[], today: string, todayIndex: number) {
  const nextDays = cloneJson(days)
  const currentIdx = nextDays.findIndex((day: any) => dayNameOf(day).toLowerCase() === today.toLowerCase())
  if (currentIdx < 0) return { days: nextDays, movedTo: null }

  const todayWorkout = nextDays[currentIdx]
  const occupied = new Set(nextDays.map((day: any) => dayNameOf(day).toLowerCase()).filter(Boolean))
  let movedTo: string | null = null

  for (let offset = 1; offset < 7; offset += 1) {
    const candidate = DAY_NAMES[(todayIndex + offset) % 7]
    if (!occupied.has(candidate.toLowerCase())) {
      movedTo = candidate
      break
    }
  }

  nextDays.splice(currentIdx, 1)
  if (movedTo) {
    const movedWorkout = cloneJson(todayWorkout)
    setDayName(movedWorkout, movedTo)
    nextDays.push(movedWorkout)
    nextDays.sort((a: any, b: any) => DAY_NAMES.indexOf(dayNameOf(a)) - DAY_NAMES.indexOf(dayNameOf(b)))
  }

  return { days: nextDays, movedTo }
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
  const language = normalizeAiLanguage(profile?.language)
  const profileText = profile ? `Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Goal: ${profile.goal}${profile.goal_target ? ` (target: ${profile.goal_target})` : ''}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Language: ${profile.language || 'en'}
Training days: ${profile.training_days_per_week ?? profile.training_days ?? 'Not specified'}/week | Gym access: ${profile.gym_access ? 'Yes' : 'No'} | Equipment: ${Array.isArray(profile.equipment) ? profile.equipment.join(', ') : 'Not specified'}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Dietary: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'None'}
Allergies: ${profile.food_allergies || profile.allergies || 'None'}
Foods loved/hated: ${profile.food_preferences || 'Not specified'}
Exercises hated: ${profile.exercises_hated || 'None'}` : 'No profile loaded'

  return `You are Ion, a careful personal trainer and nutrition coach. The user is asking to change their active ${type === 'workout' ? 'workout' : 'nutrition'} plan.

USER PROFILE:
${profileText}

USER REQUEST:
${userRequest}

CURRENT ACTIVE PLAN JSON:
${JSON.stringify(currentPlan, null, 2)}

TASK:
${aiLanguageInstruction(language, 'the summary and all user-facing string values inside updated_plan')}
- Return the full updated plan JSON, preserving the same overall shape and all useful existing fields.
- Make only the requested change plus directly necessary balancing changes.
- If this is a workout plan, keep exercise objects complete: name, sets, reps, rest_sec, weight_guidance, form_tip, muscle_group when present.
- If replacing an exercise, choose a safe equivalent for the same muscle group and the user's equipment/injuries.
- If this is a diet plan, keep daily calories/macros coherent and meal totals roughly aligned.
- If this is a diet plan, every meal must include a practical recipe object with title, prep_time_min, cook_time_min, ingredients, steps, and tips.
- If the profile language is Arabic, the saved updated_plan must read naturally in Arabic on the plan, workout, and nutrition pages. The JSON keys must stay unchanged.
- The saved updated_plan must be immediately usable by the app pages. Preserve top-level "meals" for diet plans and top-level "days" for workout plans when those fields exist.
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
  const language = normalizeAiLanguage(profile?.language)
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

${aiLanguageInstruction(language, 'every chat reply, coaching note, suggestion, plan-change summary, and structured-card text')}

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
- If the saved client language is Arabic, always reply in Arabic even if the user types English or Arabizi. If the saved client language is English, reply in English unless the user explicitly asks for Arabic.
- Do NOT mention your tier or pricing - that's handled elsewhere`
}

