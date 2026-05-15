import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canSendMessage, incrementMessageCount, isLaunchMode, getUserSubscription, effectivePlan } from '@/lib/subscription'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry, anthropicFriendlyError } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { canonicalDayName, normalizeWorkoutPlanDays } from '@/lib/workout-days'

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
      const { allowed, used, limit, plan, reason } = await canSendMessage(user.id)

      if (!allowed) {
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
    const [profileRes, userLangRes, workoutRes, dietRes, historyRes, subRes, measureRes, workoutLogRes, mealLogRes, pendingProposalRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('users').select('language').eq('id', user.id).maybeSingle(),
      supabase.from('workout_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).maybeSingle(),
      supabase.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).maybeSingle(),
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
      // Latest pending plan proposals (for two-step confirm flow)
      supabase.from('chat_messages').select('id, metadata, created_at').eq('user_id', user.id).eq('message_type', 'plan_proposal').order('created_at', { ascending: false }).limit(3),
    ])

    const profile     = profileRes.data ? { ...profileRes.data, language: userLangRes.data?.language ?? profileRes.data.language } : null
    const workoutPlan = workoutRes.data?.plan_json
    const dietPlan    = dietRes.data?.plan_json
    const planTier    = effectivePlan(subRes)
    const measurements = measureRes.data || []
    const workoutLogs  = workoutLogRes.data || []
    const mealLogs     = mealLogRes.data || []
    const pendingProposals = pendingProposalRes.data || []

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
      pendingProposals,
    })

    if (planEdit.shouldStop) {
      let reply: string
      let messageType: string
      let metadata: Record<string, any> = {}

      if (planEdit.applied) {
        // Applied a confirmed change — show done card
        reply = buildPlanEditReply(profile, planEdit)
        messageType = planEdit.type === 'workout' ? 'workout_card' : 'meal_card'
        metadata = { plan_edit: planEdit, total_estimated_cost_usd: planEdit.usage.estimated_cost_usd }
      } else if (planEdit.proposed) {
        // Proposal generated — show proposal card, store pending JSON in metadata
        reply = planEdit.proposalText
        messageType = 'plan_proposal'
        metadata = {
          pending_plan_json: planEdit.pendingPlanJson,
          pending_plan_type: planEdit.pendingPlanType,
          total_estimated_cost_usd: planEdit.usage.estimated_cost_usd,
        }
      } else {
        // Error/failure
        reply = buildPlanEditFailureReply(profile, planEdit.reason)
        messageType = 'alert'
        metadata = { plan_edit_error: planEdit.reason, total_estimated_cost_usd: 0 }
      }

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: reply,
        message_type: messageType,
        metadata,
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
        content: h.role === 'user' ? h.content : normalizeAssistantReply(h.content).content,
      }))

    const messages: Anthropic.MessageParam[] = [
      ...normalizedHistory,
      { role: 'user', content: message },
    ]

    // Stream the response via SSE
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = ''
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullText += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`))
            }
          }

          const finalMessage = await stream.finalMessage()
          const normalizedReply = normalizeAssistantReply(fullText)
          const reply = normalizedReply.content
          const messageType = normalizedReply.messageType

          const usageMetadata = {
            model: finalMessage.model,
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens,
            cache_creation_input_tokens: (finalMessage.usage as any).cache_creation_input_tokens || 0,
            cache_read_input_tokens: (finalMessage.usage as any).cache_read_input_tokens || 0,
            estimated_cost_usd: estimateAnthropicCostUsd(finalMessage.usage, finalMessage.model),
          }

          await Promise.all([
            recordAiUsage({ userId: user.id, feature: 'ion_chat', model: finalMessage.model, usage: finalMessage.usage }),
            supabase.from('chat_messages').insert({
              user_id: user.id,
              role: 'assistant',
              content: reply,
              message_type: messageType,
              metadata: { usage: usageMetadata, total_estimated_cost_usd: usageMetadata.estimated_cost_usd },
            }),
          ])

          if (!isLaunchMode()) {
            await incrementMessageCount(user.id).catch(() => {})
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', message_type: messageType, plan_edit: null })}\n\n`))
          controller.close()
        } catch (err: any) {
          console.error('Chat stream error:', err?.status, err?.message)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: anthropicFriendlyError(err) })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('Chat error:', err?.status, err?.error?.type, err?.message)
    return NextResponse.json({ error: anthropicFriendlyError(err) }, { status: 500 })
  }
}

type UsageMeta = { model: string; input_tokens: number; output_tokens: number; estimated_cost_usd: number }

type PlanEditResult =
  | { applied: false; proposed: false; shouldStop: false; reason: string }
  | { applied: false; proposed: false; shouldStop: true;  reason: string }
  | { applied: false; proposed: true;  shouldStop: true;  proposalText: string; pendingPlanJson: any; pendingPlanType: 'workout' | 'diet'; usage: UsageMeta }
  | { applied: true;  proposed: false; shouldStop: true;  type: 'workout' | 'diet'; summary: string; usage: UsageMeta }

type PlanEditIntent = 'workout' | 'diet' | 'rest_today'

// ── Detect if user is confirming a previous proposal ─────────────
function detectConfirmation(message: string): boolean {
  return /\b(yes|yeah|sure|ok|okay|do it|apply|apply it|go ahead|confirm|confirmed|that's fine|that's good|perfect|sounds good|looks good|sounds great|do that|make it|change it|update it|save it|use it|let's do it|let's go)\b|^(yes|yeah|sure|ok|okay|yep|yup|نعم|أجل|موافق|طبق|حسناً|تمام|اعمله|صح|جيد|بالتأكيد|افعل|نعم افعله|طبق التغيير)/i.test(message.trim())
}

async function maybeApplyPlanEdit({
  client,
  supabase,
  userId,
  profile,
  message,
  workoutPlanRow,
  dietPlanRow,
  pendingProposals,
}: {
  client: Anthropic
  supabase: Awaited<ReturnType<typeof createServerClient>>
  userId: string
  profile: any
  message: string
  workoutPlanRow: any
  dietPlanRow: any
  pendingProposals: any[]
}): Promise<PlanEditResult> {

  // ── STEP 1: Check if user is confirming a previous proposal ───
  if (detectConfirmation(message) && pendingProposals.length > 0) {
    // Find the most recent proposal that is < 10 min old (avoid stale confirmations)
    const recent = pendingProposals.find(p => {
      const age = Date.now() - new Date(p.created_at).getTime()
      return age < 10 * 60 * 1000 && p.metadata?.pending_plan_json
    })

    if (recent) {
      const { pending_plan_json, pending_plan_type } = recent.metadata
      const planType: 'workout' | 'diet' = pending_plan_type || 'workout'

      try {
        let finalPlan = pending_plan_json
        if (planType === 'workout') {
          finalPlan = normalizeWorkoutPlanDays(finalPlan)
          await enrichWorkoutVideos(finalPlan)
          const { error } = await supabase.from('workout_plans').update({ plan_json: finalPlan }).eq('id', workoutPlanRow.id).eq('user_id', userId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('diet_plans').update({ plan_json: finalPlan }).eq('id', dietPlanRow.id).eq('user_id', userId)
          if (error) throw error
        }
        return {
          applied: true, proposed: false, shouldStop: true, type: planType,
          summary: 'Change applied as proposed.',
          usage: { model: 'cached', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
        }
      } catch (err) {
        console.error('Apply pending proposal failed:', err)
        return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
      }
    }
  }

  // ── STEP 2: Detect new edit intent ────────────────────────────
  const intent = detectPlanEditIntent(message)
  if (!intent) return { applied: false, proposed: false, shouldStop: false, reason: 'no_plan_edit_intent' }
  if ((intent === 'workout' || intent === 'rest_today') && !workoutPlanRow?.plan_json) {
    return { applied: false, proposed: false, shouldStop: true, reason: 'no_active_workout_plan' }
  }
  if (intent === 'diet' && !dietPlanRow?.plan_json) {
    return { applied: false, proposed: false, shouldStop: true, reason: 'no_active_diet_plan' }
  }

  // Rest-day is immediate — no proposal needed
  if (intent === 'rest_today') {
    try {
      const result = applyRestDayToday(workoutPlanRow.plan_json, message)
      const { error } = await supabase.from('workout_plans').update({ plan_json: result.plan }).eq('id', workoutPlanRow.id).eq('user_id', userId)
      if (error) throw error
      return {
        applied: true, proposed: false, shouldStop: true, type: 'workout',
        summary: result.summary,
        usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
      }
    } catch (err) {
      console.error('Rest day failed:', err)
      return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
    }
  }

  // ── STEP 3: Generate proposal (DO NOT save to DB yet) ─────────
  try {
    const currentPlan = intent === 'workout' ? workoutPlanRow.plan_json : dietPlanRow.plan_json
    const prompt = buildPlanEditPrompt({ type: intent, profile, userRequest: message, currentPlan })

    const editResponse = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: intent === 'workout' ? 10000 : 6000,
      messages: [{ role: 'user', content: prompt }],
    }))

    const raw = editResponse.content[0].type === 'text' ? editResponse.content[0].text : ''
    const edit = parseJsonObject(raw)
    if (!edit?.updated_plan || typeof edit.proposal_text !== 'string') {
      return { applied: false, proposed: false, shouldStop: true, reason: 'invalid_plan_edit_response' }
    }

    await recordAiUsage({ userId, feature: `plan_proposal_${intent}`, model: editResponse.model, usage: editResponse.usage })

    return {
      applied: false,
      proposed: true,
      shouldStop: true,
      proposalText: edit.proposal_text.slice(0, 800),
      pendingPlanJson: edit.updated_plan,
      pendingPlanType: intent,
      usage: {
        model: editResponse.model,
        input_tokens: editResponse.usage.input_tokens,
        output_tokens: editResponse.usage.output_tokens,
        estimated_cost_usd: estimateAnthropicCostUsd(editResponse.usage, editResponse.model),
      },
    }
  } catch (err) {
    console.error('Plan proposal failed:', err)
    return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
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
  const currentIdx = nextDays.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === today)
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
    nextDays.sort((a: any, b: any) =>
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(a)))) -
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(b))))
    )
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
  const ar = language === 'ar'

  const foodsLoved   = profile?.foods_loved   || 'Not specified'
  const foodsHated   = profile?.foods_hated   || 'None'
  const exHated      = profile?.exercises_hated || 'None'
  const allergies    = profile?.allergies || profile?.food_allergies || 'None'
  const dietary      = Array.isArray(profile?.dietary_preference) ? profile.dietary_preference.join(', ') : profile?.dietary_preference || 'None'
  const injuries     = profile?.injuries || 'None'
  const equipment    = Array.isArray(profile?.equipment) ? profile.equipment.join(', ') : 'Not specified'
  const gymAccess    = profile?.gym_access ? 'Yes' : 'No'
  const cookingAbility = profile?.cooking_ability || 'Not specified'
  const budget       = profile?.food_budget || 'Not specified'
  const strengthLevels = profile?.strength_levels || 'Not specified'

  const profileText = profile ? `Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Goal: ${profile.goal}${profile.goal_target ? ` (target: ${profile.goal_target})` : ''}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm | Language: ${profile.language || 'en'}
Training days: ${profile.training_days_per_week ?? profile.training_days ?? 'Not specified'}/week | Gym access: ${gymAccess} | Equipment: ${equipment}
Injuries/medical: ${injuries} | ${profile?.medical_conditions || 'No medical conditions'}
Dietary restrictions: ${dietary} | Allergies: ${allergies}
Foods LOVED (must use these): ${foodsLoved}
Foods HATED (never use these): ${foodsHated}
Exercises HATED (never program these): ${exHated}
Cooking ability: ${cookingAbility} | Food budget: ${budget}
Strength levels (current working weights): ${strengthLevels}` : 'No profile loaded'

  return `You are Ion, an elite personal trainer and nutrition coach. The user wants to change their active ${type === 'workout' ? 'workout' : 'nutrition'} plan.

USER PROFILE:
${profileText}

USER REQUEST:
"${userRequest}"

CURRENT ACTIVE PLAN JSON:
${JSON.stringify(currentPlan, null, 2)}

YOUR TASK:
You must PROPOSE a personalised change — not apply it blindly. Think like a coach: interpret what the user actually needs, then build a specific updated plan using ONLY their personal preferences, foods, and constraints above.

PERSONALIZATION RULES (non-negotiable):
${type === 'diet' ? `- MUST include foods from "Foods LOVED" list in meal suggestions
- MUST NOT include ANY food from "Foods HATED" list
- MUST NOT include ANY food from "Allergies" list
- MUST respect dietary restrictions: ${dietary}
- Meals must match their cooking ability (${cookingAbility}) and food budget (${budget})` :
`- MUST NOT program any exercise from "Exercises HATED" list
- MUST use their available equipment: ${equipment}
- MUST respect injuries: ${injuries}
- If strength levels are provided, use them to calibrate weight_guidance and progression
- Choose substitute exercises the user will enjoy and can actually do`}

OUTPUT RULES:
${aiLanguageInstruction(language, 'the proposal_text and all user-facing strings inside updated_plan')}
- Return the full updated plan JSON preserving the same overall shape and all existing useful fields.
- Make only the requested change plus directly necessary balancing adjustments.
${type === 'workout' ? `- Keep exercise objects complete: name, sets, reps, rest_sec, weight_guidance, form_tip, muscle_group.
- day_name values must stay exact English weekdays (Sunday … Saturday). Translate coaching text but not day_name.` :
`- Keep daily calories/macros coherent. Every meal must include: title, prep_time_min, cook_time_min, ingredients, steps, tips.`}
- If language is Arabic, all user-facing strings must be in Arabic. JSON keys must stay unchanged.
- Preserve top-level "meals" for diet plans and "days" for workout plans.
- Do NOT include markdown or any text outside the JSON wrapper.

proposal_text must be 2–3 sentences in ${ar ? 'Arabic' : 'English'}: explain exactly WHAT you changed, WHY it suits this specific user (reference their foods/exercises/goals), and invite them to confirm. Be specific — mention the actual food or exercise names.

Return ONLY valid JSON in this exact wrapper:
{
  "proposal_text": "2–3 sentence personalised proposal for the user to review",
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

type MessageType = 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan' | 'plan_proposal'

function normalizeAssistantReply(raw: string): { content: string; messageType: MessageType } {
  const cleaned = stripCodeFences(raw)
  const parsed = parseJsonObject(cleaned)
  if (parsed && typeof parsed === 'object') {
    const content =
      typeof parsed.message === 'string' ? parsed.message :
      typeof parsed.reply === 'string' ? parsed.reply :
      typeof parsed.content === 'string' ? parsed.content :
      ''
    const messageType = typeof parsed.type === 'string' && isMessageType(parsed.type)
      ? parsed.type
      : 'text'

    if (content.trim()) return { content: content.trim(), messageType }
  }

  return { content: cleaned.trim(), messageType: 'text' }
}

function stripCodeFences(raw: string) {
  return String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function isMessageType(value: string): value is MessageType {
  return ['text', 'suggestion', 'workout_card', 'meal_card', 'milestone', 'alert', 'new_plan', 'plan_proposal'].includes(value)
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
1. You are a real coach: direct, confident, warm — not a chatbot reciting facts.
2. You ALWAYS personalise every response using the CLIENT PROFILE, logs, and measurements above. Never give generic advice.
3. Use the client's name naturally. Reference their specific plan exercises, meal names, and logged numbers — not made-up examples.
4. Keep responses short and punchy (2–4 sentences) unless a detailed breakdown is genuinely needed.
5. Proactively call out patterns you see in the data: weight plateaus (< 0.5 kg change over 3+ measurements), 3+ consecutive missed sessions, protein intake below 70% of daily target, or left/right body symmetry gaps > 1.5 cm. Don't wait to be asked.
6. When the client asks to modify their plan, FIRST propose the specific personalised change you intend to make (2–3 sentences: what, why it fits them, invite confirmation). NEVER apply a plan edit without the client confirming first. After they say yes/okay/go ahead, apply immediately. For simple rest-day swaps you may apply directly without a proposal.
7. For medical or injury questions, recommend a doctor first, then still give practical guidance within safe limits.
8. If the client is struggling or feeling demotivated, be honest and encouraging — no hollow praise. Name what's actually going well.
9. Language rule: If the saved client language is Arabic, ALWAYS reply in Arabic even if the user types English or Arabizi. If English, reply in English unless the user explicitly asks to switch.
10. Format rule: Return plain natural-language text only. Never wrap replies in JSON, markdown code fences, or code blocks.
11. Supplement rule: If CLIENT TIER is ELITE, you may give detailed personalised supplement protocols with timing, dosing, and stacking. For STARTER or PRO clients, acknowledge supplement questions briefly and let them know personalised protocols are available on the Elite plan — do not give a full protocol.
12. Data integrity rule: Never fabricate body metrics, food calories, exercise names, or plan data. If a data point is missing, say so clearly rather than estimating a number.
13. Billing rule: If the client asks about their subscription plan, pricing, upgrading, or cancelling, direct them politely to Settings → Billing. Do not discuss plan pricing or feature tiers in chat.
14. Goal timeline rule: If CLIENT TIER is ELITE, you may give a detailed month-by-month projection toward their goal based on current rate of change. For STARTER or PRO clients, give general progress encouragement only — no specific timeline projections.`
}

