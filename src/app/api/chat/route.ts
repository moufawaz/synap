import { createAdminClient, createRouteClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canSendMessage, incrementMessageCount, isLaunchMode, getUserSubscription, effectivePlan } from '@/lib/subscription'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry, anthropicFriendlyError } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { canonicalDayName, normalizeWorkoutPlanDays } from '@/lib/workout-days'

// Plan-edit calls Claude with up to 10 000 output tokens; it can take 30-40 s.
// Without this Vercel cuts the connection at the platform default (10-15 s),
// which causes the client to receive a network error ("Load failed").
export const maxDuration = 60

async function fetchRecentWorkoutLogs(supabase: any, userId: string) {
  const primary = await supabase
    .from('workout_log')
    .select('date,day_name,completion_pct,duration_min,exercises_completed')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  if (!primary.error) return primary

  return supabase
    .from('workout_logs')
    .select('date,day_name,exercises_completed,total_exercises,duration_minutes,logged_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)
}

export async function GET(req: Request) {
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 120), 1), 300)
  const admin = createAdminClient()

  const [profileRes, historyRes, planRes, usageRes] = await Promise.all([
    admin.from('profiles').select('gender').eq('user_id', user.id).maybeSingle(),
    admin.from('chat_messages')
      .select('id, role, content, message_type, metadata, created_at')
      .eq('user_id', user.id)
      .in('role', ['user', 'assistant', 'ion'])
      .order('created_at', { ascending: false })
      .limit(limit),
    admin.from('workout_plans')
      .select('created_at, end_date')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    isLaunchMode() ? Promise.resolve({ allowed: true, used: 0, limit: Infinity, plan: 'elite' }) : canSendMessage(user.id),
  ])

  // Surface the active plan's cycle end for the app's "days left in your plan"
  // banner. Use the stored end_date when present (new plans set one); otherwise
  // fall back to the fixed 6-week workout cycle from created_at — so older
  // 12-week plans don't show an 84-day window.
  let activeWorkoutPlan: { created_at: string; end_date: string | null } | null = null
  if (planRes.data?.created_at) {
    const end = planRes.data.end_date
      ?? new Date(new Date(planRes.data.created_at).getTime() + 42 * 86400000).toISOString().slice(0, 10)
    activeWorkoutPlan = { created_at: planRes.data.created_at, end_date: end }
  }

  return NextResponse.json({
    profile: profileRes.data ?? null,
    messages: (historyRes.data ?? []).reverse(),
    activeWorkoutPlan,
    usage: { used: usageRes.used, limit: usageRes.limit, plan: usageRes.plan },
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
    const body = await req.json()
    const { message } = body
    const wantsJsonResponse = body.stream === false || body.responseMode === 'json'

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const supabase = await createRouteClient(req)

    const { user, error: authError } = await getAuthenticatedUser(req)
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
    const [profileRes, userLangRes, workoutRes, dietRes, historyRes, subRes, measureRes, workoutLogRes, mealLogRes, pendingProposalRes, planChangesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('users').select('language').eq('id', user.id).maybeSingle(),
      supabase.from('workout_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('diet_plans').select('id, plan_json').eq('user_id', user.id).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('chat_messages').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      getUserSubscription(user.id),
      // Latest 5 measurements: enough to compute a meaningful trend
      supabase.from('measurements').select('date,weight_kg,body_fat_pct,waist_cm,chest_cm,hips_cm,bicep_left_cm,bicep_right_cm,thigh_left_cm,thigh_right_cm')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      // Last 7 workout logs
      fetchRecentWorkoutLogs(supabase, user.id),
      // Last 7 meal logs: one week is enough for compliance analysis
      supabase.from('meals_log').select('date,meal_time,description,calories_estimated,protein_g,carbs_g,fats_g')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
      // Latest pending plan proposals (for two-step confirm flow).
      // Proposals are stored as message_type='text' (to satisfy the DB check constraint)
      // with metadata.is_plan_proposal=true so they can be found here.
      supabase.from('chat_messages').select('id, metadata, created_at').eq('user_id', user.id).eq('message_type', 'text').contains('metadata', { is_plan_proposal: true }).order('created_at', { ascending: false }).limit(3),
      // Recent plan changes made via chat (last 30 days)
      supabase.from('chat_messages')
        .select('content, message_type, metadata, created_at')
        .eq('user_id', user.id)
        .in('message_type', ['meal_card', 'workout_card'])
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const profile     = profileRes.data ? { ...profileRes.data, language: userLangRes.data?.language ?? profileRes.data.language } : null
    const workoutPlan = workoutRes.data?.plan_json
    const dietPlan    = dietRes.data?.plan_json
    const planTier    = effectivePlan(subRes)
    const measurements = measureRes.data || []
    const workoutLogs  = workoutLogRes.data || []
    const mealLogs     = mealLogRes.data || []
    const pendingProposals = pendingProposalRes.data || []
    const recentPlanChanges = planChangesRes.data || []

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
      recentHistory: history,
      planTier,
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
        // Proposal generated — show proposal card, store pending JSON in metadata.
        // message_type must be 'text' (DB check constraint); the proposal identity is
        // stored in metadata.is_plan_proposal so the query above can find it later.
        reply = planEdit.proposalText
        messageType = 'plan_proposal'
        metadata = {
          is_plan_proposal: true,
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

      // 'plan_proposal' is not in the DB check constraint — persist as 'text' with
      // is_plan_proposal=true in metadata (already set above). The client still
      // receives the original messageType in the JSON response for UI rendering.
      const dbMessageType = messageType === 'plan_proposal' ? 'text' : messageType
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: reply,
        message_type: dbMessageType,
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

    const systemPrompt = buildSystemPrompt(profile, workoutPlan, dietPlan, planTier, measurements, workoutLogs, mealLogs, recentPlanChanges)

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

    if (wantsJsonResponse) {
      const finalMessage = await client.messages.create({
        model: process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-5',
        // Headroom for the detailed responses the system prompt permits (Elite
        // supplement protocols, goal projections, multi-pattern callouts) so they
        // don't truncate mid-sentence. Short replies are unaffected — the model
        // stops when done, and rule 4 keeps everyday answers to 2–4 sentences.
        max_tokens: 2048,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
      })

      const rawText = finalMessage.content
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('')

      const normalizedReply = normalizeAssistantReply(rawText)
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

      return NextResponse.json({
        reply,
        message_type: messageType,
        plan_edit: null,
      })
    }

    // Stream the response via SSE
    // system is an array so we can attach cache_control — the prompt is re-used across
    // multiple turns in a session and caching it cuts repeated input cost by ~10x
    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
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
type TodayWorkoutTarget = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body'
type WorkoutDayMove = { sourceDay: string; targetDay: string }
type WorkoutDaySwap = { firstDay: string; secondDay: string }

function isExplanationQuestion(message: string): boolean {
  const text = message.trim().toLowerCase()
  return /\?/.test(text)
    || /^(how|what|why|where|when|can you explain|explain|tell me|show me)\b/.test(text)
    || /\b(how to|how do i|how can i|what does|what is|don'?t understand|do not understand|not understand|confused|explain|help me understand)\b/.test(text)
    || /(\u0643\u064a\u0641|\u0645\u0627\u0630\u0627|\u0644\u064a\u0634|\u0644\u0645\u0627\u0630\u0627|\u0627\u0632\u0627\u064a|\u0625\u0632\u0627\u064a|\u0627\u0634\u0631\u062d|\u0645\u0634\s+\u0641\u0627\u0647\u0645|\u0645\u0627\s+\u0641\u0647\u0645\u062a|\u0644\u0627\s+\u0623\u0641\u0647\u0645|\u0627\u064a\u0647|\u0625\u064a\u0647)/.test(text)
}

// ── Detect if user is confirming a previous proposal ─────────────
function detectConfirmation(message: string): boolean {
  const text = message.trim().toLowerCase()
  if (!text) return false

  const askingForExplanation = isExplanationQuestion(message)
  const rejectingChange = /\b(no|nope|don't|do not|not now|stop|cancel|return|revert|undo|don't change|do not change)\b|لا|الغ|الغي|تراجع|ارجع/.test(text)
  if (askingForExplanation || rejectingChange) return false
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
  recentHistory,
  planTier,
}: {
  client: Anthropic
  supabase: Awaited<ReturnType<typeof createRouteClient>>
  userId: string
  profile: any
  message: string
  workoutPlanRow: any
  dietPlanRow: any
  pendingProposals: any[]
  recentHistory: { role: string; content: string }[]
  planTier: 'starter' | 'trial' | 'pro' | 'elite'
}): Promise<PlanEditResult> {
  const recentContext = buildRecentPlanEditContext(recentHistory)

  // Editing your plan through Ion is a trial / Pro / Elite feature. Free Starter
  // users (whose 7-day trial has ended) can still chat, but plan edits are gated:
  // if this message is a plan-edit attempt, stop with a subscribe prompt.
  if (planTier === 'starter') {
    const isConfirm = detectConfirmation(message) && pendingProposals.length > 0
    const hasIntent = !!detectPlanEditIntent(message, recentContext) || !!detectTodayWorkoutTarget(message, recentContext)
    if (isConfirm || hasIntent) {
      return { applied: false, proposed: false, shouldStop: true, reason: 'requires_subscription' }
    }
    return { applied: false, proposed: false, shouldStop: false, reason: 'no_plan_edit_intent' }
  }

  // ── STEP 1: Check if user is confirming a previous proposal ───
  if (detectConfirmation(message) && pendingProposals.length > 0) {
    // Find the most recent proposal that is < 10 min old (avoid stale confirmations)
    const recent = pendingProposals.find(p => {
      const age = Date.now() - new Date(p.created_at).getTime()
      return age < 10 * 60 * 1000 && p.metadata?.pending_plan_json
    })

    if (recent) {
      const daySwap = detectWorkoutDaySwap(message, recentContext)
      if (daySwap && workoutPlanRow?.plan_json) {
        try {
          const result = applyWorkoutDaySwap(workoutPlanRow.plan_json, daySwap, buildEffectivePlanEditRequest(message, recentContext))
          const finalPlan = prepareWorkoutPlanForSave(result.plan, 'confirmed day swap')
          await enrichWorkoutVideos(finalPlan)
          const { error } = await supabase.from('workout_plans').update({ plan_json: finalPlan }).eq('id', workoutPlanRow.id).eq('user_id', userId)
          if (error) throw error
          return {
            applied: true, proposed: false, shouldStop: true, type: 'workout',
            summary: result.summary,
            usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
          }
        } catch (err) {
          console.error('Apply pending day swap failed:', err)
          return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
        }
      }

      const dayMove = detectWorkoutDayMove(message, recentContext)
      if (dayMove && workoutPlanRow?.plan_json) {
        try {
          const result = applyWorkoutDayMove(workoutPlanRow.plan_json, dayMove, buildEffectivePlanEditRequest(message, recentContext), profile)
          const finalPlan = prepareWorkoutPlanForSave(result.plan, 'confirmed day move')
          await enrichWorkoutVideos(finalPlan)
          const { error } = await supabase.from('workout_plans').update({ plan_json: finalPlan }).eq('id', workoutPlanRow.id).eq('user_id', userId)
          if (error) throw error
          return {
            applied: true, proposed: false, shouldStop: true, type: 'workout',
            summary: result.summary,
            usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
          }
        } catch (err) {
          console.error('Apply pending day move failed:', err)
          return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
        }
      }

      const { pending_plan_json, pending_plan_type } = recent.metadata
      const planType: 'workout' | 'diet' = pending_plan_type || 'workout'

      try {
        let finalPlan = pending_plan_json
        if (planType === 'workout') {
          finalPlan = prepareWorkoutPlanForSave(finalPlan, 'pending proposal')
          // pending_plan_json was built by applyWorkoutChanges(), which preserves all
          // existing exercises and only sets video_id=null for newly swapped ones —
          // so no preserveExistingVideoIds() call is needed here.
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
  if (isExplanationQuestion(message)) {
    return { applied: false, proposed: false, shouldStop: false, reason: 'question_not_plan_edit' }
  }
  const daySwap = detectWorkoutDaySwap(message, recentContext)
  if (daySwap && workoutPlanRow?.plan_json) {
    try {
      const result = applyWorkoutDaySwap(workoutPlanRow.plan_json, daySwap, buildEffectivePlanEditRequest(message, recentContext))
      return {
        applied: false, proposed: true, shouldStop: true,
        proposalText: buildDeterministicPlanProposal(profile, result.summary),
        pendingPlanJson: normalizeWorkoutPlanDays(repairRestDayExerciseArtifacts(result.plan)),
        pendingPlanType: 'workout',
        usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
      }
    } catch (err) {
      console.error('Workout day swap failed:', err)
      return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
    }
  }
  const dayMove = detectWorkoutDayMove(message, recentContext)
  if (dayMove && workoutPlanRow?.plan_json) {
    try {
      const result = applyWorkoutDayMove(workoutPlanRow.plan_json, dayMove, buildEffectivePlanEditRequest(message, recentContext), profile)
      return {
        applied: false, proposed: true, shouldStop: true,
        proposalText: buildDeterministicPlanProposal(profile, result.summary),
        pendingPlanJson: normalizeWorkoutPlanDays(repairRestDayExerciseArtifacts(result.plan)),
        pendingPlanType: 'workout',
        usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
      }
    } catch (err) {
      console.error('Workout day move failed:', err)
      return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
    }
  }
  const todayWorkoutTarget = detectTodayWorkoutTarget(message, recentContext)
  const intent = detectPlanEditIntent(message, recentContext)
  if (!intent && !todayWorkoutTarget) return { applied: false, proposed: false, shouldStop: false, reason: 'no_plan_edit_intent' }
  if ((intent === 'workout' || intent === 'rest_today' || todayWorkoutTarget) && !workoutPlanRow?.plan_json) {
    return { applied: false, proposed: false, shouldStop: true, reason: 'no_active_workout_plan' }
  }
  if (intent === 'diet' && !dietPlanRow?.plan_json) {
    return { applied: false, proposed: false, shouldStop: true, reason: 'no_active_diet_plan' }
  }

  if (todayWorkoutTarget && workoutPlanRow?.plan_json) {
    try {
      const result = applyWorkoutDayToday(workoutPlanRow.plan_json, todayWorkoutTarget, buildEffectivePlanEditRequest(message, recentContext))
      return {
        applied: false, proposed: true, shouldStop: true,
        proposalText: buildDeterministicPlanProposal(profile, result.summary),
        pendingPlanJson: normalizeWorkoutPlanDays(repairRestDayExerciseArtifacts(result.plan)),
        pendingPlanType: 'workout',
        usage: { model: 'deterministic', input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 },
      }
    } catch (err) {
      console.error('Today workout swap failed:', err)
      return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
    }
  }
  if (!intent) return { applied: false, proposed: false, shouldStop: false, reason: 'no_plan_edit_intent' }

  // Rest-day is immediate — no proposal needed
  if (intent === 'rest_today') {
    try {
      const result = applyRestDayToday(workoutPlanRow.plan_json, buildEffectivePlanEditRequest(message, recentContext))
      return {
        applied: false, proposed: true, shouldStop: true,
        proposalText: buildDeterministicPlanProposal(profile, result.summary),
        pendingPlanJson: normalizeWorkoutPlanDays(repairRestDayExerciseArtifacts(result.plan)),
        pendingPlanType: 'workout',
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
    const userRequest = buildEffectivePlanEditRequest(message, recentContext)
    const { system: editSystem, user: editUser } = buildPlanEditPrompt({ type: intent, profile, userRequest, currentPlan })

    // Workout edits return typed patch operations, not full-plan rewrites.
    // This keeps cost low and prevents unrelated plan sections from drifting.
    const editResponse = await withAnthropicRetry(() => client.messages.create({
      model: process.env.ANTHROPIC_CRON_MODEL || 'claude-haiku-4-5',
      max_tokens: intent === 'workout' ? 2200 : 3500,
      // Static profile + rules cached; only the exercise list / plan JSON changes per call
      system: [{ type: 'text', text: editSystem, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: editUser }],
    }))

    // If Claude hit the token ceiling mid-response the JSON will be malformed.
    if (editResponse.stop_reason === 'max_tokens') {
      console.error('[plan-edit] output truncated at max_tokens')
      return { applied: false, proposed: false, shouldStop: true, reason: 'plan_edit_failed' }
    }

    const raw = editResponse.content[0].type === 'text' ? editResponse.content[0].text : ''
    const edit = parseJsonObject(raw)

    // Validate: workout expects typed operations; diet expects full updated_plan.
    const validWorkout = intent === 'workout' && Array.isArray(edit?.operations) && edit.operations.length > 0
    const validDiet    = intent === 'diet'    && !!edit?.updated_plan
    if (typeof edit?.proposal_text !== 'string' || (!validWorkout && !validDiet)) {
      console.error('[plan-edit] invalid response shape', JSON.stringify(edit)?.slice(0, 200))
      return { applied: false, proposed: false, shouldStop: true, reason: 'invalid_plan_edit_response' }
    }

    await recordAiUsage({ userId, feature: `plan_proposal_${intent}`, model: editResponse.model, usage: editResponse.usage })

    // Build the pending plan: workout patches are applied server-side; diet uses full replacement.
    let pendingPlanJson: any
    if (intent === 'workout') {
      const { plan, appliedCount } = applyWorkoutChanges(workoutPlanRow.plan_json, edit.operations)
      if (appliedCount < 1 || JSON.stringify(plan) === JSON.stringify(workoutPlanRow.plan_json)) {
        console.error('[plan-edit] workout operations produced no change', JSON.stringify(edit.operations)?.slice(0, 500))
        return { applied: false, proposed: false, shouldStop: true, reason: 'invalid_plan_edit_response' }
      }
      pendingPlanJson = prepareWorkoutPlanForSave(plan, 'generated operations')
    } else {
      pendingPlanJson = edit.updated_plan
    }

    if (detectConfirmation(message) && hasPlanEditContext(recentContext)) {
      let finalPlan = pendingPlanJson
      if (intent === 'workout') {
        finalPlan = prepareWorkoutPlanForSave(finalPlan, 'inline confirmation')
        // Only the newly swapped exercises have video_id=null; enrich just those.
        await enrichWorkoutVideos(finalPlan)
        const { error } = await supabase.from('workout_plans').update({ plan_json: finalPlan }).eq('id', workoutPlanRow.id).eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('diet_plans').update({ plan_json: finalPlan }).eq('id', dietPlanRow.id).eq('user_id', userId)
        if (error) throw error
      }

      return {
        applied: true,
        proposed: false,
        shouldStop: true,
        type: intent,
        summary: edit.proposal_text.slice(0, 500),
        usage: {
          model: editResponse.model,
          input_tokens: editResponse.usage.input_tokens,
          output_tokens: editResponse.usage.output_tokens,
          estimated_cost_usd: estimateAnthropicCostUsd(editResponse.usage, editResponse.model),
        },
      }
    }

    return {
      applied: false,
      proposed: true,
      shouldStop: true,
      proposalText: edit.proposal_text.slice(0, 800),
      pendingPlanJson,
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

function detectPlanEditIntent(message: string, recentContext = ''): PlanEditIntent | null {
  const currentText = message.toLowerCase()
  const text = currentText
  const contextText = `${currentText}\n${recentContext}`.toLowerCase()
  const latestContext = latestAssistantContext(recentContext).toLowerCase()
  const hasArabic = /[\u0600-\u06FF]/.test(message)
  const restTodayWords = /\b(rest day|take a rest|rest today|skip today|day off|move today|reschedule today|postpone today|recover today)\b|(?:\u062e\u0644\u064a|\u0627\u062c\u0639\u0644|\u0627\u0639\u0645\u0644|\u062d\u0648\u0644|\u063a\u064a\u0631|\u0628\u062f\u0644|\u0627\u0646\u0642\u0644|\u0623\u062c\u0644|\u0627\u062c\u0644).{0,24}(?:\u0627\u0644\u064a\u0648\u0645|\u0627\u0644\u0646\u0647\u0627\u0631\u062f\u0647).{0,24}(?:\u0631\u0627\u062d\u0629|\u0627\u0633\u062a\u0631\u0627\u062d\u0629|\u0631\u064a\u0633\u062a)|(?:\u0627\u0644\u064a\u0648\u0645|\u0627\u0644\u0646\u0647\u0627\u0631\u062f\u0647).{0,24}(?:\u0631\u0627\u062d\u0629|\u0627\u0633\u062a\u0631\u0627\u062d\u0629|\u0631\u064a\u0633\u062a)/
  if (restTodayWords.test(text)) return 'rest_today'

  const changeWords = /\b(change|swap|replace|remove|avoid|hate|dislike|allergic|allergy|can't eat|cannot eat|adjust|update|modify|instead|alternative|increase|decrease|raise|lower|more|less|reduce|add)\b|غير|غيّر|بدل|استبدل|احذف|شيل|عدل|عدّل|تعديل|تحديث|زود|قلل|أضف|اضف|حساسية|ما اقدر|ما أقدر|لا أستطيع|بديل/
  const confirmationOnly = detectConfirmation(message)
  if (!changeWords.test(text) && !confirmationOnly) return null

  const workoutWords = /\b(exercise|workout|training|lift|bench|squat|deadlift|cardio|sets|reps|gym|machine|dumbbell|barbell|shoulder|knee|back pain|leg|chest|back|biceps|triceps)\b|تمرين|تمارين|تدريب|جيم|سكوات|بنش|ديدلفت|كارديو|مجموعات|تكرارات|كتف|ركبة|ظهر|صدر|رجل|بايسبس|ترايسبس/
  const dietWords = /\b(food|meal|diet|nutrition|calorie|calories|macro|protein|carb|fat|breakfast|lunch|dinner|snack|chicken|rice|egg|milk|fish|beef|vegetarian|vegan|oats|bread)\b|أكل|اكل|وجبة|وجبات|غذاء|تغذية|سعرات|سعرة|بروتين|كارب|كربوهيدرات|دهون|فطور|غداء|عشاء|سناك|دجاج|رز|أرز|بيض|حليب|سمك|لحم|شوفان|خبز/

  const workoutActionWords = /\b(workout plan|exercise plan|training plan|active training|training days?|metabolic finisher|finisher|exercise|workout|training|sets?|reps?|jump squat|push-?up|tricep|rope pushdown|squat|bench|deadlift|cardio)\b/
  const dietActionWords = /\b(nutrition plan|diet plan|meal plan|meal|food|calorie|macro|breakfast|lunch|dinner|snack)\b/

  if (confirmationOnly && latestContext) {
    const latestHasWorkout = workoutActionWords.test(latestContext)
    const latestHasDiet = dietActionWords.test(latestContext)
    const dietOnlyUnchanged = /\b(nutrition|diet|meal plan)\s+(?:remains|stays|is)\s+(?:exactly\s+)?(?:the\s+)?same/.test(latestContext)
    if (latestHasWorkout && (!latestHasDiet || dietOnlyUnchanged)) return 'workout'
    if (latestHasDiet && !latestHasWorkout) return 'diet'
  }

  if (workoutWords.test(text) && !dietWords.test(text)) return 'workout'
  if (dietWords.test(text) && !workoutWords.test(text)) return 'diet'
  if ((changeWords.test(text) || confirmationOnly) && workoutActionWords.test(contextText) && (!dietWords.test(contextText) || !dietActionWords.test(latestContext))) return 'workout'
  if ((changeWords.test(text) || confirmationOnly) && dietWords.test(contextText)) return 'diet'
  if (/\b(exercise|workout|training|gym)\b|تمرين|تدريب|جيم/.test(text)) return 'workout'
  if (/\b(food|meal|diet|nutrition|calorie|macro)\b|أكل|اكل|وجبة|غذاء|تغذية|سعرات/.test(text)) return 'diet'
  if (hasArabic) return null
  return null
}

function buildRecentPlanEditContext(history: { role: string; content: string }[]) {
  return history
    .slice(-8)
    .map(item => `${item.role}: ${normalizeAssistantReply(item.content).content}`)
    .join('\n')
    .slice(-3000)
}

function latestAssistantContext(context: string) {
  const lines = String(context || '').split('\n')
  const latest = [...lines].reverse().find(line => /^assistant:/i.test(line))
  return latest || context
}

function hasPlanEditContext(context: string) {
  return /\b(update|change|replace|swap|remove|instead|meal|dinner|lunch|breakfast|food|nutrition|workout|exercise|plan|chicken|rice|beef|pasta)\b|تغيير|غير|بدل|استبدل|وجبة|أكل|اكل|تغذية|تمرين/.test(context.toLowerCase())
}

function buildEffectivePlanEditRequest(message: string, recentContext: string) {
  return recentContext
    ? `Current user message: ${message}\n\nRecent chat context that explains the requested plan change:\n${recentContext}`
    : message
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

function buildDeterministicPlanProposal(profile: any, summary: string) {
  const ar = profile?.language === 'ar'
  return ar
    ? `أقترح هذا التغيير قبل الحفظ:\n\n${summary}\n\nاكتب "تأكيد" أو اضغط Confirm وسأحفظه في خطتك.`
    : `I'm proposing this change before saving:\n\n${summary}\n\nConfirm and I'll apply it to your plan.`
}

function buildPlanEditFailureReply(profile: any, reason: string) {
  const ar = profile?.language === 'ar'
  if (reason === 'requires_subscription') {
    return ar
      ? 'تعديل خطتك عبر آيون متاح خلال تجربتك المجانية (7 أيام) ومع خطط Pro و Elite. انتهت تجربتك المجانية، لذا اشترك من الإعدادات ← الاشتراك والفوترة لأستمر في تعديل خطتك مباشرة.'
      : 'Editing your plan with Ion is available during your 7-day free trial and on the Pro and Elite plans. Your free trial has ended — subscribe from Settings → Subscription & Billing and I’ll keep updating your plan directly.'
  }
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
    : 'I could not apply that change safely, so I did not save it to your plan. Try a more specific request like "replace squats with leg press", "add 2 sets to bench press", or "move Monday workout to Wednesday."'
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

function detectTodayWorkoutTarget(message: string, recentContext = ''): TodayWorkoutTarget | null {
  const text = `${message}\n${latestAssistantContext(recentContext)}`.toLowerCase()
  const refersToToday = /\b(today|tonight|this day)\b|\u0627\u0644\u064a\u0648\u0645|\u0627\u0644\u0646\u0647\u0627\u0631\u062f\u0647/.test(text)
  if (!refersToToday) return null

  if (/\b(push|chest|shoulders?|triceps?)\b|\u0628\u0648\u0634|\u0635\u062f\u0631|\u0643\u062a\u0641|\u062a\u0631\u0627\u064a/.test(text)) return 'push'
  if (/\b(pull|back|biceps?|lats?|row)\b|\u0633\u062d\u0628|\u0638\u0647\u0631|\u0628\u0627\u064a/.test(text)) return 'pull'
  if (/\b(legs?|leg day|quads?|hamstrings?|glutes?|calves?|squat)\b|\u0631\u062c\u0644|\u0623\u0631\u062c\u0644|\u0627\u0631\u062c\u0644|\u0633\u0643\u0648\u0627\u062a/.test(text)) return 'legs'
  if (/\b(upper|upper body)\b/.test(text)) return 'upper'
  if (/\b(lower|lower body)\b/.test(text)) return 'lower'
  if (/\b(full body|full-body)\b|\u0641\u0648\u0644\s*\u0628\u0627\u062f\u064a/.test(text)) return 'full_body'
  return null
}

function applyWorkoutDayToday(currentPlan: any, target: TodayWorkoutTarget, request: string) {
  const plan = cloneJson(currentPlan)
  const today = DAY_NAMES[new Date().getDay()]
  const adjustment = {
    date: new Date().toISOString(),
    type: 'set_today_workout',
    target,
    request,
    note: `Ion set ${today} to ${target.replace('_', ' ')} day as requested.`,
  }

  let changed = false
  const applyToDays = (days: any[]) => {
    const nextDays = cloneJson(days)
    const sourceIdx = nextDays.findIndex((day: any) => dayMatchesWorkoutTarget(day, target))
    if (sourceIdx < 0) return { days: nextDays, changed: false }

    const todayIdx = nextDays.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === today)
    if (todayIdx >= 0 && todayIdx !== sourceIdx) {
      const sourceName = dayNameOf(nextDays[sourceIdx])
      setDayName(nextDays[sourceIdx], dayNameOf(nextDays[todayIdx]) || sourceName)
      setDayName(nextDays[todayIdx], today)
    } else {
      setDayName(nextDays[sourceIdx], today)
    }

    nextDays.sort((a: any, b: any) =>
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(a)))) -
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(b))))
    )
    return { days: nextDays, changed: true }
  }

  if (Array.isArray(plan.days)) {
    const result = applyToDays(plan.days)
    plan.days = result.days
    changed = changed || result.changed
  }

  if (Array.isArray(plan.weeks)) {
    plan.weeks = plan.weeks.map((week: any) => {
      if (!Array.isArray(week.days)) return week
      const result = applyToDays(week.days)
      changed = changed || result.changed
      return { ...week, days: result.days }
    })
  }

  if (!changed) throw new Error(`No ${target} workout day found`)

  plan.ion_adjustments = [
    ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
    adjustment,
  ]

  return {
    plan,
    summary: `Today is now ${target.replace('_', ' ')} day. I updated your workout pages so you can train it today.`,
  }
}

function dayMatchesWorkoutTarget(day: any, target: TodayWorkoutTarget) {
  const haystack = [
    day?.day_name, day?.day, day?.name, day?.title, day?.focus, day?.split, day?.workout_type,
    ...(Array.isArray(day?.muscle_groups) ? day.muscle_groups : []),
    ...(day?.exercises || []).flatMap((ex: any) => [ex?.name, ex?.title, ex?.muscle_group, ex?.target_muscle]),
  ].filter(Boolean).join(' ').toLowerCase()

  const rules: Record<TodayWorkoutTarget, RegExp> = {
    push: /\b(push|chest|shoulder|tricep|bench press|incline .*press|shoulder press|chest press|cable fly|lateral raise)\b/,
    pull: /\b(pull|back|bicep|lat|row|pulldown|face pull)\b/,
    legs: /\b(leg|lower|quad|hamstring|glute|calf|squat|lunge|deadlift|leg press)\b/,
    upper: /\b(upper|chest|back|shoulder|bicep|tricep)\b/,
    lower: /\b(lower|leg|quad|hamstring|glute|calf|squat|lunge|deadlift)\b/,
    full_body: /\b(full body|full-body|total body)\b/,
  }
  return rules[target].test(haystack)
}

function detectWorkoutDaySwap(message: string, recentContext = ''): WorkoutDaySwap | null {
  const latest = latestAssistantContext(recentContext)
  const text = `${message}\n${latest}`.toLowerCase()
  const swapping = /\b(swap|exchange|switch|trade)\b.{0,30}\b(between|days?|workouts?)\b|\bbetween\b.{0,40}\band\b|بدل|بدّل|بادل|تبديل|استبدل/.test(text)
  if (!swapping) return null

  const found = findDayMentions(text)
  if (found.length < 2) return null
  const first = canonicalDayName(found[0])
  const second = canonicalDayName(found[1])
  if (!first || !second || first === second) return null
  return { firstDay: String(first), secondDay: String(second) }
}

function findDayMentions(text: string) {
  const aliases: Array<[string, string]> = [
    ['Sunday', 'sunday|sun|الأحد|الاحد|احد'],
    ['Monday', 'monday|mon|الإثنين|الاثنين|اثنين'],
    ['Tuesday', 'tuesday|tue|tues|الثلاثاء|ثلاثاء'],
    ['Wednesday', 'wednesday|wed|الأربعاء|الاربعاء|اربعاء'],
    ['Thursday', 'thursday|thu|thur|thurs|الخميس|خميس'],
    ['Friday', 'friday|fri|الجمعة|الجمعه|جمعة|جمعه'],
    ['Saturday', 'saturday|sat|السبت|سبت'],
  ]
  const mentions: Array<{ index: number; day: string }> = []
  for (const [day, pattern] of aliases) {
    const re = new RegExp(`\\b(?:${pattern})\\b|(?:${pattern})`, 'gi')
    let match: RegExpExecArray | null
    while ((match = re.exec(text))) {
      mentions.push({ index: match.index, day })
    }
  }
  return mentions
    .sort((a, b) => a.index - b.index)
    .map(item => item.day)
    .filter((day, index, arr) => arr.indexOf(day) === index)
}

function applyWorkoutDaySwap(currentPlan: any, swap: WorkoutDaySwap, request: string) {
  const plan = cloneJson(currentPlan)
  const firstDay = String(canonicalDayName(swap.firstDay))
  const secondDay = String(canonicalDayName(swap.secondDay))
  const adjustment = {
    date: new Date().toISOString(),
    type: 'swap_workout_days',
    first_day: firstDay,
    second_day: secondDay,
    request,
    note: `Ion swapped ${firstDay}'s workout with ${secondDay}'s workout.`,
  }

  let changed = false
  const applyToDays = (days: any[]) => {
    const nextDays = cloneJson(days)
    const firstIdx = nextDays.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === firstDay)
    const secondIdx = nextDays.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === secondDay)
    if (firstIdx < 0 || secondIdx < 0) return { days: nextDays, changed: false }

    const firstWorkout = cloneJson(nextDays[firstIdx])
    const secondWorkout = cloneJson(nextDays[secondIdx])
    setDayName(firstWorkout, secondDay)
    setDayName(secondWorkout, firstDay)
    firstWorkout.ion_rescheduled_from = firstDay
    secondWorkout.ion_rescheduled_from = secondDay
    firstWorkout.ion_rescheduled_at = new Date().toISOString()
    secondWorkout.ion_rescheduled_at = new Date().toISOString()
    nextDays[firstIdx] = secondWorkout
    nextDays[secondIdx] = firstWorkout
    nextDays.sort((a: any, b: any) =>
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(a)))) -
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(b))))
    )
    return { days: nextDays, changed: true }
  }

  if (Array.isArray(plan.days)) {
    const result = applyToDays(plan.days)
    plan.days = result.days
    changed = changed || result.changed
  }
  if (Array.isArray(plan.weeks)) {
    plan.weeks = plan.weeks.map((week: any) => {
      if (!Array.isArray(week.days)) return week
      const result = applyToDays(week.days)
      changed = changed || result.changed
      return { ...week, days: result.days }
    })
  }

  if (!changed) throw new Error(`Could not find both ${firstDay} and ${secondDay} workout days`)
  plan.ion_adjustments = [
    ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
    adjustment,
  ]
  return {
    plan,
    summary: `I swapped ${firstDay} and ${secondDay}. ${firstDay} now has ${secondDay}'s workout, and ${secondDay} now has ${firstDay}'s workout.`,
  }
}

function detectWorkoutDayMove(message: string, recentContext = ''): WorkoutDayMove | null {
  const latest = latestAssistantContext(recentContext)
  const text = `${message}\n${latest}`.toLowerCase()
  const moving = /\b(move|reschedule|shift|switch)\b|\bfrom\b.{0,40}\bto\b|انقل|نقل|بدل|حوّل|حول/.test(text)
  if (!moving) return null

  const sourceDay = findDayAfter(text, /\bfrom\s+/i) || findDayAfter(text, /\bmoving\b.{0,60}\bfrom\s+/i)
  const targetDay = findDayAfter(text, /\bto\s+/i) || findDayAfter(text, /(?:الى|إلى|لـ|ليوم)\s*/i)
  if (!sourceDay || !targetDay) return null

  const source = canonicalDayName(sourceDay)
  const target = canonicalDayName(targetDay)
  if (!source || !target || source === target) return null
  return { sourceDay: String(source), targetDay: String(target) }
}

function findDayAfter(text: string, prefix: RegExp) {
  const match = text.match(new RegExp(`${prefix.source}(${DAY_NAMES.join('|')}|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت)`, 'i'))
  return match?.[1] || ''
}

function applyWorkoutDayMove(currentPlan: any, move: WorkoutDayMove, request: string, profile?: any) {
  const plan = cloneJson(currentPlan)
  const sourceDay = String(canonicalDayName(move.sourceDay))
  const targetDay = String(canonicalDayName(move.targetDay))
  const targetIndex = DAY_NAMES.indexOf(targetDay)
  const adjustment = {
    date: new Date().toISOString(),
    type: 'move_workout_day',
    source_day: sourceDay,
    target_day: targetDay,
    request,
    note: `Ion moved ${sourceDay}'s workout to ${targetDay}, leaving ${sourceDay} as a rest day.`,
  }

  let changed = false
  const applyToDays = (days: any[]) => {
    const nextDays = cloneJson(days)
    const sourceIdx = nextDays.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === sourceDay)
    if (sourceIdx < 0) return { days: nextDays, changed: false }

    const movedWorkout = cloneJson(nextDays[sourceIdx])
    setDayName(movedWorkout, targetDay)
    movedWorkout.ion_rescheduled_from = sourceDay
    movedWorkout.ion_rescheduled_at = new Date().toISOString()

    const withoutSource = nextDays.filter((_: any, index: number) => index !== sourceIdx)
    const targetIdx = withoutSource.findIndex((day: any) => canonicalDayName(dayNameOf(day)) === targetDay)
    if (targetIdx >= 0) {
      const displacedWorkout = cloneJson(withoutSource[targetIdx])
      const occupied = new Set(withoutSource.map((day: any) => String(canonicalDayName(dayNameOf(day))).toLowerCase()).filter(Boolean))
      occupied.delete(targetDay.toLowerCase())
      const candidates = DAY_NAMES.filter(candidate =>
        candidate !== sourceDay && !occupied.has(candidate.toLowerCase())
      )
      const shiftedTo = chooseSmartMoveDay(candidates, targetIndex, profile, request)
      if (!shiftedTo) throw new Error(`No free day to preserve displaced ${targetDay} workout`)
      setDayName(displacedWorkout, shiftedTo)
      displacedWorkout.ion_rescheduled_from = targetDay
      displacedWorkout.ion_rescheduled_at = new Date().toISOString()
      withoutSource[targetIdx] = movedWorkout
      withoutSource.push(displacedWorkout)
    } else {
      withoutSource.push(movedWorkout)
    }

    withoutSource.sort((a: any, b: any) =>
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(a)))) -
      DAY_NAMES.indexOf(String(canonicalDayName(dayNameOf(b))))
    )
    return { days: withoutSource, changed: true }
  }

  if (Array.isArray(plan.days)) {
    const result = applyToDays(plan.days)
    plan.days = result.days
    changed = changed || result.changed
  }

  if (Array.isArray(plan.weeks)) {
    plan.weeks = plan.weeks.map((week: any) => {
      if (!Array.isArray(week.days)) return week
      const result = applyToDays(week.days)
      changed = changed || result.changed
      return { ...week, days: result.days }
    })
  }

  if (!changed) throw new Error(`No ${sourceDay} workout day found`)

  plan.ion_adjustments = [
    ...(Array.isArray(plan.ion_adjustments) ? plan.ion_adjustments : []),
    adjustment,
  ]

  return {
    plan,
    summary: `${sourceDay} is now a rest day. I moved that workout to ${targetDay} and saved it to your workout pages.`,
  }
}

function chooseSmartMoveDay(candidates: string[], anchorIndex: number, profile: any, request: string) {
  if (candidates.length === 0) return ''

  const context = [
    request,
    profile?.work_schedule,
    profile?.work_hours,
    profile?.training_time,
    profile?.wake_time,
    profile?.sleep_time,
    profile?.lunch_break,
    profile?.lunch_break_time,
  ].filter(Boolean).join('\n').toLowerCase()

  const ranked = candidates.map(day => ({
    day,
    score: scoreTrainingDayCandidate(day, anchorIndex, context, profile),
  })).sort((a, b) => b.score - a.score)

  return ranked[0]?.day || ''
}

function scoreTrainingDayCandidate(day: string, anchorIndex: number, context: string, profile: any) {
  const dayIndex = DAY_NAMES.indexOf(day)
  const forwardDistance = (dayIndex - anchorIndex + 7) % 7 || 7
  let score = 100 - forwardDistance * 4

  const dayPattern = dayRegex(day)
  const busyNearDay = new RegExp(`${dayPattern}.{0,40}(course|class|lecture|exam|work|shift|busy|unavailable|can't|cannot|مشغول|محاضرة|كورس|شغل|دوام|جامعة|امتحان|مش\\s+فاضي)|(?:course|class|lecture|exam|work|shift|busy|unavailable|can't|cannot|مشغول|محاضرة|كورس|شغل|دوام|جامعة|امتحان|مش\\s+فاضي).{0,40}${dayPattern}`, 'i')
  const freeNearDay = new RegExp(`${dayPattern}.{0,40}(free|available|off|day off|can train|فاضي|متاح|اجازة|إجازة)|(?:free|available|off|day off|can train|فاضي|متاح|اجازة|إجازة).{0,40}${dayPattern}`, 'i')

  if (busyNearDay.test(context)) score -= 80
  if (freeNearDay.test(context)) score += 45

  const isWeekend = day === 'Friday' || day === 'Saturday'
  const workText = `${profile?.work_schedule || ''} ${profile?.work_hours || ''}`.toLowerCase()
  if (/(office|9.?to.?5|9-5|standard|work|دوام|شغل)/i.test(workText) && !/weekend|shift|rotating|شفت|ورديات/i.test(workText)) {
    score += isWeekend ? 12 : -4
  }
  if (/(student|course|class|university|جامعة|كورس|محاضرة)/i.test(workText)) {
    score += isWeekend ? 8 : 0
  }

  const trainingTime = String(profile?.training_time || '').toLowerCase()
  if (/morning|am|صباح/.test(trainingTime) && /wake|استيقاظ/.test(context)) score += 2
  if (/evening|night|pm|مساء|ليل/.test(trainingTime) && /late|night|مساء|ليل/.test(context)) score += 2

  return score
}

function dayRegex(day: string) {
  const aliases: Record<string, string[]> = {
    Sunday: ['sunday', 'sun', 'الأحد', 'الاحد', 'احد'],
    Monday: ['monday', 'mon', 'الإثنين', 'الاثنين', 'اثنين'],
    Tuesday: ['tuesday', 'tue', 'tues', 'الثلاثاء', 'ثلاثاء'],
    Wednesday: ['wednesday', 'wed', 'الأربعاء', 'الاربعاء', 'اربعاء'],
    Thursday: ['thursday', 'thu', 'thur', 'thurs', 'الخميس', 'خميس'],
    Friday: ['friday', 'fri', 'الجمعة', 'الجمعه', 'جمعة', 'جمعه'],
    Saturday: ['saturday', 'sat', 'السبت', 'سبت'],
  }
  return `(?:${(aliases[day] || [day]).map(escapeRegExp).join('|')})`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function repairRestDayExerciseArtifacts(currentPlan: any) {
  const plan = cloneJson(currentPlan)
  const removeFakeRestDays = (days: any[]) =>
    days.filter((day: any) => {
      const exercises = Array.isArray(day?.exercises) ? day.exercises : []
      return !exercises.some((ex: any) => /^rest\s*day$/i.test(String(ex?.name || '').trim()))
    })

  if (Array.isArray(plan.days)) plan.days = removeFakeRestDays(plan.days)
  if (Array.isArray(plan.weeks)) {
    plan.weeks = plan.weeks.map((week: any) => ({
      ...week,
      days: Array.isArray(week?.days) ? removeFakeRestDays(week.days) : week?.days,
    }))
  }
  return plan
}

function prepareWorkoutPlanForSave(currentPlan: any, source: string) {
  const plan = normalizeWorkoutPlanDays(repairRestDayExerciseArtifacts(currentPlan))
  const validation = validateWorkoutPlanStructure(plan)
  if (!validation.valid) {
    throw new Error(`Invalid workout plan from ${source}: ${validation.reason}`)
  }
  return plan
}

function validateWorkoutPlanStructure(plan: any): { valid: true } | { valid: false; reason: string } {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { valid: false, reason: 'plan must be an object' }
  }

  if (Array.isArray(plan.weeks)) {
    for (const [weekIndex, week] of plan.weeks.entries()) {
      if (!week || typeof week !== 'object') {
        return { valid: false, reason: `week ${weekIndex + 1} must be an object` }
      }
      if ('days' in week && !Array.isArray(week.days)) {
        return { valid: false, reason: `week ${weekIndex + 1} days must be an array` }
      }
    }
  }

  const containers = getExistingWorkoutDayContainers(plan)
  if (!containers.length) return { valid: false, reason: 'plan has no day container' }

  let totalTrainingDays = 0
  for (const [containerIndex, days] of containers.entries()) {
    const seenDays = new Set<string>()
    for (const [dayIndex, day] of days.entries()) {
      if (!day || typeof day !== 'object' || Array.isArray(day)) {
        return { valid: false, reason: `day ${dayIndex + 1} in container ${containerIndex + 1} must be an object` }
      }

      const canonical = canonicalDayName(dayNameOf(day))
      if (!DAY_NAMES.includes(String(canonical))) {
        return { valid: false, reason: `invalid day name "${dayNameOf(day)}"` }
      }
      if (seenDays.has(String(canonical))) {
        return { valid: false, reason: `duplicate ${canonical} in the same workout cycle` }
      }
      seenDays.add(String(canonical))

      const exercises = day.exercises
      if (!Array.isArray(exercises) || exercises.length < 2) {
        return { valid: false, reason: `${canonical} must have at least 2 exercises` }
      }
      for (const [exerciseIndex, exercise] of exercises.entries()) {
        if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) {
          return { valid: false, reason: `${canonical} exercise ${exerciseIndex + 1} must be an object` }
        }
        const name = String(exercise.name || '').trim()
        if (!name) return { valid: false, reason: `${canonical} exercise ${exerciseIndex + 1} has no name` }
        if (/^rest\s*day$/i.test(name)) {
          return { valid: false, reason: `${canonical} contains a fake Rest Day exercise` }
        }
      }
      totalTrainingDays++
    }
  }

  if (totalTrainingDays < 1) return { valid: false, reason: 'plan has no training days' }
  return { valid: true }
}

function getExistingWorkoutDayContainers(plan: any): any[][] {
  const containers: any[][] = []
  if (Array.isArray(plan?.days)) containers.push(plan.days)
  if (Array.isArray(plan?.weeks)) {
    for (const week of plan.weeks) {
      if (Array.isArray(week?.days)) containers.push(week.days)
    }
  }
  return containers
}

function isValidTrainingDayPayload(day: any) {
  if (!day || typeof day !== 'object' || Array.isArray(day)) return false
  if (!DAY_NAMES.includes(String(canonicalDayName(dayNameOf(day))))) return false
  if (!Array.isArray(day.exercises) || day.exercises.length < 2) return false
  return day.exercises.every((exercise: any) =>
    exercise &&
    typeof exercise === 'object' &&
    !Array.isArray(exercise) &&
    String(exercise.name || '').trim() &&
    !/^rest\s*day$/i.test(String(exercise.name || '').trim())
  )
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
}): { system: string; user: string } {
  const language = normalizeAiLanguage(profile?.language)
  const ar = language === 'ar'

  const foodsLoved     = profile?.foods_loved   || 'Not specified'
  const foodsHated     = profile?.foods_hated   || 'None'
  const exHated        = profile?.exercises_hated || 'None'
  const allergies      = profile?.allergies || profile?.food_allergies || 'None'
  const dietary        = Array.isArray(profile?.dietary_preference) ? profile.dietary_preference.join(', ') : profile?.dietary_preference || 'None'
  const injuries       = profile?.injuries || 'None'
  const equipment      = Array.isArray(profile?.equipment) ? profile.equipment.join(', ') : 'Not specified'
  const gymAccess      = profile?.gym_access ? 'Yes' : 'No'
  const cookingAbility = profile?.cooking_ability || 'Not specified'
  const budget         = profile?.food_budget || 'Not specified'
  const strengthLevels = profile?.strength_levels || 'Not specified'

  const inbodyText = (profile?.body_fat_pct || profile?.muscle_mass_kg || profile?.visceral_fat != null || profile?.inbody_score != null)
    ? `Body fat: ${profile?.body_fat_pct ?? '?'}% | Muscle mass: ${profile?.muscle_mass_kg ?? '?'}kg | Visceral fat: ${profile?.visceral_fat ?? '?'}${Number(profile?.visceral_fat) > 10 ? ' (HIGH)' : ''} | InBody score: ${profile?.inbody_score ?? '?'}/100${profile?.bmr_kcal ? ` | Measured BMR: ${profile.bmr_kcal} kcal` : ''}`
    : null

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
Strength levels (current working weights): ${strengthLevels}${inbodyText ? `\nInBody scan data: ${inbodyText}` : ''}` : 'No profile loaded'

  if (type === 'workout') {
    const system = `You are Ion, an elite personal trainer. The user wants to edit their active workout plan.

USER PROFILE:
${profileText}

SMART EDIT RULES:
- Accept the user's requested workout edit whenever it is physically safe and compatible with their profile.
- You may edit exercises, sets, reps, rest, weight guidance, cardio, finishers, training days, split, session duration, deload notes, exercise order, home/gym substitutions, and workout timing.
- Use the user's data: goal, injuries, equipment, disliked exercises, schedule, training time, experience, recent compliance, and body-composition context.
- If the user asks for something risky, do not refuse. Apply the closest safe version and explain the safety adjustment in proposal_text.
- MUST NOT program any exercise from "Exercises HATED": ${exHated}
- MUST use their available equipment: ${equipment}
- MUST respect injuries: ${injuries}
- Return only targeted operations. Do not rewrite the whole plan.
- If moving or swapping days, preserve the same number of training days unless the user explicitly asks to reduce/increase days.
- Do not add fake exercises named "Rest Day". A rest day means that day is absent from the workout days list.

OUTPUT RULES:
${aiLanguageInstruction(language, 'proposal_text and all user-facing strings inside operation values')}
- day_name must be an exact English weekday (Sunday … Saturday).
- Never combine multiple movements into one exercise name.
- New or changed exercise objects must include enough fields for the UI: name, sets, reps, rest_sec or rest_seconds, weight guidance/suggestion, muscle_group, category.
- New or changed exercises should set video_id to null.
- For vague requests like "make it harder" or "make it easier", use EXACTLY 1–2 operations max: add 1 set to 1 main lift OR tighten/loosen rest by 15s OR add/remove one short finisher. Do NOT change multiple days or many exercises.
- For training-day count changes, use add_training_day/remove_training_day only when the user explicitly asks for a different number of days.
- HARD LIMIT: output at most 6 operations total. If the request needs more, pick the 6 most impactful.
- Do NOT include markdown or any text outside the JSON wrapper.

proposal_text: 2–4 sentences in ${ar ? 'Arabic' : 'English'} — state exactly WHAT changed, WHY it fits this user's data, and invite confirm.

Return ONLY valid JSON in this exact wrapper:
{
  "proposal_text": "2–4 sentence personalised proposal for the user to review",
  "operations": [
    { "op": "replace_exercise", "day_name": "Monday", "old_exercise_name": "Exact existing name", "new_exercise": { "name": "...", "sets": 4, "reps": "8-12", "rest_sec": 60, "weight_guidance": "...", "form_tip": "...", "muscle_group": "...", "category": "compound", "video_id": null } },
    { "op": "update_exercise_fields", "day_name": "Monday", "exercise_name": "Exact existing name", "fields": { "sets": 4, "reps": "10-12", "rest_sec": 75, "weight_guidance": "..." } },
    { "op": "add_exercise", "day_name": "Monday", "after_exercise_name": "Optional exact existing name", "exercise": { "name": "...", "sets": 3, "reps": "12-15", "rest_sec": 45, "weight_guidance": "...", "form_tip": "...", "muscle_group": "...", "category": "accessory", "video_id": null } },
    { "op": "remove_exercise", "day_name": "Monday", "exercise_name": "Exact existing name" },
    { "op": "move_exercise", "day_name": "Monday", "exercise_name": "Exact existing name", "after_exercise_name": "Optional exact existing name or empty for top" },
    { "op": "reorder_exercises", "day_name": "Monday", "exercise_names": ["Exact existing name 1", "Exact existing name 2"] },
    { "op": "update_day_metadata", "day_name": "Monday", "fields": { "duration_min": 60, "focus": "...", "title": "..." } },
    { "op": "add_training_day", "day": { "day_name": "Friday", "title": "...", "duration_min": 45, "exercises": [ ...complete exercise objects... ] } },
    { "op": "remove_training_day", "day_name": "Friday" }
  ]
}`

    const user = `USER REQUEST:
"${userRequest}"

CURRENT ACTIVE WORKOUT PLAN INDEX:
${buildWorkoutPatchContext(currentPlan)}`

    return { system, user }
  }

  // ── DIET: full-plan approach (diet plans are small enough) ─────────────
  const system = `You are Ion, an elite nutrition coach. The user wants to change their active nutrition plan.

USER PROFILE:
${profileText}

PERSONALIZATION RULES (non-negotiable):
- MUST include foods from "Foods LOVED" list in meal suggestions
- MUST NOT include ANY food from "Foods HATED" list
- MUST NOT include ANY food from "Allergies" list
- MUST respect dietary restrictions: ${dietary}
- Meals must match their cooking ability (${cookingAbility}) and food budget (${budget})

OUTPUT RULES:
${aiLanguageInstruction(language, 'the proposal_text and all user-facing strings inside updated_plan')}
- Return the full updated plan JSON preserving the same overall shape and all existing useful fields.
- Make only the requested change plus directly necessary balancing adjustments.
- Keep daily calories/macros coherent. Every meal must include: title, prep_time_min, cook_time_min, ingredients, steps, tips.
- If language is Arabic, all user-facing strings must be in Arabic. JSON keys must stay unchanged.
- Preserve top-level "meals" for diet plans.
- Do NOT include markdown or any text outside the JSON wrapper.

proposal_text must be 2–3 sentences in ${ar ? 'Arabic' : 'English'}: explain exactly WHAT you changed, WHY it suits this specific user, and invite them to confirm.

Return ONLY valid JSON in this exact wrapper:
{
  "proposal_text": "2–3 sentence personalised proposal for the user to review",
  "updated_plan": { ...full updated plan... }
}`

  const user = `USER REQUEST:
"${userRequest}"

CURRENT ACTIVE PLAN JSON:
${JSON.stringify(currentPlan, null, 2)}`

  return { system, user }
}

function buildWorkoutPatchContext(plan: any) {
  return getWorkoutDays(plan).map((day: any) => {
    const exercises = (day.exercises || []).map((ex: any) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_sec: ex.rest_sec ?? ex.rest_seconds,
      weight_guidance: ex.weight_guidance ?? ex.weight_suggestion,
      muscle_group: ex.muscle_group,
      category: ex.category,
    }))
    return JSON.stringify({
      day_name: dayNameOf(day),
      title: day.title ?? day.workout_name ?? day.focus ?? day.muscle_focus,
      duration_min: day.duration_min,
      muscle_groups: day.muscle_groups ?? day.muscle_focus,
      exercises,
    })
  }).join('\n')
}

/**
 * Apply typed workout operations returned by the patch prompt.
 * Mutates a deep clone of originalPlan and returns it.
 */
function applyWorkoutChanges(originalPlan: any, operations: any[]): { plan: any; newExercises: any[]; appliedCount: number } {
  const plan = cloneJson(originalPlan)
  const dayEntries = getWorkoutDayEntries(plan)
  const newExercises: any[] = []
  let appliedCount = 0

  const findDayEntries = (dayName: string) =>
    dayEntries.filter((entry) => canonicalDayName(dayNameOf(entry.day)) === canonicalDayName(dayName))

  const findExerciseIndex = (day: any, name: string) => {
    const exercises: any[] = Array.isArray(day?.exercises) ? day.exercises : []
    return exercises.findIndex((ex: any) => String(ex?.name || '').toLowerCase().trim() === String(name || '').toLowerCase().trim())
  }

  for (const operation of operations) {
    if (!operation?.op) continue
    const op = String(operation.op)

    if (op === 'add_training_day' && operation.day) {
      if (!isValidTrainingDayPayload(operation.day)) continue
      const dayName = dayNameOf(operation.day)
      if (!dayName) continue
      for (const targetDays of getWorkoutDayContainers(plan)) {
        const existsInContainer = targetDays.some((day: any) => canonicalDayName(dayNameOf(day)) === canonicalDayName(dayName))
        if (existsInContainer) continue
        const day = cloneJson(operation.day)
        day.exercises = Array.isArray(day.exercises) ? day.exercises.map((ex: any) => ({ ...ex, video_id: ex.video_id ?? null })) : []
        targetDays.push(day)
        dayEntries.push({ day, days: targetDays })
        newExercises.push(...day.exercises)
        appliedCount++
      }
      continue
    }

    const targetEntries = findDayEntries(operation.day_name)
    if (!targetEntries.length) continue

    if (op === 'remove_training_day') {
      for (const targetEntry of [...targetEntries]) {
        const idx = targetEntry.days.indexOf(targetEntry.day)
        if (idx >= 0) {
          targetEntry.days.splice(idx, 1)
          const entryIdx = dayEntries.indexOf(targetEntry)
          if (entryIdx >= 0) dayEntries.splice(entryIdx, 1)
          appliedCount++
        }
      }
      continue
    }

    if (op === 'update_day_metadata' && operation.fields && typeof operation.fields === 'object') {
      for (const { day: targetDay } of targetEntries) {
        Object.assign(targetDay, operation.fields)
        appliedCount++
      }
      continue
    }

    if (op === 'replace_exercise') {
      if (!operation.new_exercise) continue
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        targetDay.exercises = exercises
        const idx = findExerciseIndex(targetDay, operation.old_exercise_name)
        if (idx < 0) continue
        const newEx = { ...operation.new_exercise, video_id: operation.new_exercise.video_id ?? null }
        exercises[idx] = newEx
        newExercises.push(newEx)
        appliedCount++
      }
      continue
    }

    if (op === 'update_exercise_fields') {
      if (!operation.fields || typeof operation.fields !== 'object') continue
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        targetDay.exercises = exercises
        const idx = findExerciseIndex(targetDay, operation.exercise_name)
        if (idx < 0) continue
        exercises[idx] = { ...exercises[idx], ...operation.fields }
        if ('name' in operation.fields || 'video_id' in operation.fields) exercises[idx].video_id = operation.fields.video_id ?? null
        if (exercises[idx].video_id === null) newExercises.push(exercises[idx])
        appliedCount++
      }
      continue
    }

    if (op === 'add_exercise' && operation.exercise) {
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        targetDay.exercises = exercises
        const newEx = { ...operation.exercise, video_id: operation.exercise.video_id ?? null }
        const afterIdx = operation.after_exercise_name ? findExerciseIndex(targetDay, operation.after_exercise_name) : -1
        exercises.splice(afterIdx >= 0 ? afterIdx + 1 : exercises.length, 0, newEx)
        newExercises.push(newEx)
        appliedCount++
      }
      continue
    }

    if (op === 'remove_exercise') {
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        const idx = findExerciseIndex(targetDay, operation.exercise_name)
        if (idx >= 0) {
          exercises.splice(idx, 1)
          appliedCount++
        }
      }
      continue
    }

    if (op === 'move_exercise') {
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        targetDay.exercises = exercises
        const fromIdx = findExerciseIndex(targetDay, operation.exercise_name)
        if (fromIdx < 0) continue
        const [exercise] = exercises.splice(fromIdx, 1)
        const afterIdx = operation.after_exercise_name ? findExerciseIndex(targetDay, operation.after_exercise_name) : -1
        exercises.splice(afterIdx >= 0 ? afterIdx + 1 : 0, 0, exercise)
        appliedCount++
      }
      continue
    }

    if (op === 'reorder_exercises' && Array.isArray(operation.exercise_names)) {
      const requestedNames = operation.exercise_names.map((name: any) => String(name || '').toLowerCase().trim()).filter(Boolean)
      if (!requestedNames.length) continue
      for (const { day: targetDay } of targetEntries) {
        const exercises: any[] = Array.isArray(targetDay.exercises) ? targetDay.exercises : []
        const requested: any[] = []
        const remaining = [...exercises]
        for (const name of requestedNames) {
          const idx = remaining.findIndex((ex: any) => String(ex?.name || '').toLowerCase().trim() === name)
          if (idx >= 0) requested.push(...remaining.splice(idx, 1))
        }
        if (requested.length) {
          targetDay.exercises = [...requested, ...remaining]
          appliedCount++
        }
      }
    }
  }

  return { plan, newExercises, appliedCount }
}

function getWorkoutDayEntries(plan: any): Array<{ day: any; days: any[] }> {
  if (Array.isArray(plan?.days)) {
    return plan.days.map((day: any) => ({ day, days: plan.days }))
  }
  if (Array.isArray(plan?.weeks)) {
    return plan.weeks.flatMap((week: any) => {
      const days = Array.isArray(week?.days) ? week.days : []
      return days.map((day: any) => ({ day, days }))
    })
  }
  return []
}

function getWorkoutDayContainers(plan: any): any[][] {
  if (Array.isArray(plan?.days)) return [plan.days]
  if (Array.isArray(plan?.weeks)) {
    return plan.weeks.map((week: any) => {
      if (!Array.isArray(week.days)) week.days = []
      return week.days
    })
  }
  return [ensureTopLevelWorkoutDays(plan)]
}

function ensureTopLevelWorkoutDays(plan: any): any[] {
  if (!Array.isArray(plan.days)) plan.days = []
  return plan.days
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

// Only types that are valid in the DB check constraint and safe to return from the
// AI normaliser. 'plan_proposal' and 'renewal_preview' are set programmatically,
// never by the AI, so they must not appear here — the DB insert uses 'text' for them.
type MessageType = 'text' | 'suggestion' | 'workout_card' | 'meal_card' | 'milestone' | 'alert' | 'new_plan'

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
  return ['text', 'suggestion', 'workout_card', 'meal_card', 'milestone', 'alert', 'new_plan'].includes(value)
}

/**
 * Copy video_id values from the original plan onto any matching exercise in the
 * updated plan that is missing one. Haiku does not reliably preserve video_id
 * (it's not in its output schema), so without this step every exercise in the
 * updated plan would trigger a fresh YouTube scrape — even the ones that were
 * not changed at all — blocking the event loop for tens of seconds.
 */
function preserveExistingVideoIds(originalPlan: any, updatedPlan: any) {
  const originalById: Record<string, string> = {}
  for (const day of getWorkoutDays(originalPlan)) {
    for (const ex of day.exercises || []) {
      if (ex.name && ex.video_id && /^[a-zA-Z0-9_-]{11}$/.test(ex.video_id)) {
        originalById[ex.name.toLowerCase().trim()] = ex.video_id
      }
    }
  }
  for (const day of getWorkoutDays(updatedPlan)) {
    for (const ex of day.exercises || []) {
      if (ex.name && !ex.video_id) {
        const preserved = originalById[ex.name.toLowerCase().trim()]
        if (preserved) ex.video_id = preserved
      }
    }
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
  recentPlanChanges: any[] = [],
): string {
  const language = normalizeAiLanguage(profile?.language)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const profileBlock = profile ? `
Name: ${profile.name}
Age: ${profile.age} | Gender: ${profile.gender}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Goal: ${profile.goal}${profile.goal_target ? ` (target: ${profile.goal_target})` : ''}${profile.goal_date ? ` by ${profile.goal_date}` : ''}
Training: ${profile.training_days} days/week | ${profile.gym_access ? 'Has gym access' : 'Home training'}${profile.session_duration ? ` | ${profile.session_duration} min sessions` : ''}${profile.training_time ? ` | Trains in the ${profile.training_time}` : ''}
Experience: ${profile.training_experience || 'Not specified'} | Style: ${profile.training_style || 'Not specified'}
Wake: ${profile.wake_time || '?'} | Sleep: ${profile.sleep_time || '?'} | Work/study: ${profile.work_schedule || 'Not specified'}${profile.work_hours ? ` (${profile.work_hours})` : ''}${profile.lunch_break ? ` | Lunch break: ${profile.lunch_break}` : ''}
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Diet: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'No restrictions'}
Allergies: ${profile.allergies || 'None'}
Foods loved: ${profile.foods_loved || 'Not specified'} | Foods hated: ${profile.foods_hated || 'Not specified'}
Meals/day: ${profile.meals_per_day || 'Not specified'} | Cooking: ${profile.cooking_ability || 'Not specified'} | Budget: ${profile.food_budget || 'Not specified'}
Supplements: ${Array.isArray(profile.supplements) ? profile.supplements.join(', ') : profile.supplements || 'None'}
Exercises hated: ${profile.exercises_hated || 'None'}
Stress: ${profile.stress_level || 'Not specified'} | Sleep quality: ${profile.sleep_quality || 'Not specified'}
Activity level: ${profile.activity_level || 'Not specified'}${profile.body_fat_pct || profile.muscle_mass_kg || profile.visceral_fat != null || profile.inbody_score != null ? `
InBody scan data:${profile.body_fat_pct ? ` BF% ${profile.body_fat_pct}%` : ''}${profile.muscle_mass_kg ? ` | Muscle mass ${profile.muscle_mass_kg}kg` : ''}${profile.visceral_fat != null ? ` | Visceral fat ${profile.visceral_fat}${Number(profile.visceral_fat) > 10 ? ' (HIGH RISK)' : ''}` : ''}${profile.inbody_score != null ? ` | InBody score ${profile.inbody_score}/100` : ''}${profile.bmr_kcal ? ` | Measured BMR ${profile.bmr_kcal} kcal` : ''}` : ''}
`.trim() : 'No profile loaded yet - introduce yourself and ask them to complete onboarding.'

  const measureBlock = measurements.length > 0
    ? measurements.map(m => `${m.date}: ${m.weight_kg}kg${m.body_fat_pct ? `, ${m.body_fat_pct}% BF` : ''}${m.waist_cm ? `, waist ${m.waist_cm}cm` : ''}${m.chest_cm ? `, chest ${m.chest_cm}cm` : ''}${m.hips_cm ? `, hips ${m.hips_cm}cm` : ''}${m.bicep_left_cm ? `, L-bicep ${m.bicep_left_cm}cm` : ''}${m.bicep_right_cm ? ` R-bicep ${m.bicep_right_cm}cm` : ''}${m.thigh_left_cm ? `, L-thigh ${m.thigh_left_cm}cm` : ''}${m.thigh_right_cm ? ` R-thigh ${m.thigh_right_cm}cm` : ''}`).join('\n')
    : 'No measurements recorded yet.'

  const workoutLogBlock = workoutLogs.length > 0
    ? workoutLogs.map(l => `${l.date}${l.day_name ? ` (${l.day_name})` : ''}: ${l.completion_pct ?? '?'}% complete${l.duration_min ? `, ${l.duration_min} min` : ''}`).join('\n')
    : 'No recent workout logs.'

  // ── Workout compliance analysis ──────────────────────────────────────────
  let workoutComplianceBlock = 'Not enough workout log data to assess compliance.'
  if (workoutLogs.length > 0) {
    const logsWithPct = workoutLogs.filter(l => l.completion_pct != null)
    const avgCompletion = logsWithPct.length > 0
      ? Math.round(logsWithPct.reduce((sum, l) => sum + (l.completion_pct || 0), 0) / logsWithPct.length)
      : null
    const fullySessions = workoutLogs.filter(l => (l.completion_pct || 0) >= 80).length
    const skippedDays = workoutLogs.filter(l => (l.completion_pct || 0) < 40 && l.day_name).map(l => l.day_name)
    // Weekly frequency estimate (group dates into ~7-day windows)
    const uniqueDates = [...new Set(workoutLogs.map(l => l.date))].sort()
    let weeksSpanned = 1
    if (uniqueDates.length >= 2) {
      const span = (new Date(uniqueDates[uniqueDates.length - 1]).getTime() - new Date(uniqueDates[0]).getTime()) / (1000 * 60 * 60 * 24)
      weeksSpanned = Math.max(1, Math.round(span / 7))
    }
    const avgSessionsPerWeek = (workoutLogs.length / weeksSpanned).toFixed(1)
    const plannedDays = profile?.training_days || profile?.training_days_per_week || '?'
    const complianceLabel = avgCompletion == null ? 'unknown'
      : avgCompletion >= 90 ? 'EXCELLENT'
      : avgCompletion >= 70 ? 'GOOD'
      : avgCompletion >= 50 ? 'NEEDS IMPROVEMENT'
      : 'POOR'
    workoutComplianceBlock = `Last ${workoutLogs.length} session(s) logged:
  Avg completion: ${avgCompletion != null ? `${avgCompletion}% (${complianceLabel})` : 'N/A'}
  Fully completed (≥80%): ${fullySessions}/${workoutLogs.length}
  Frequency: ~${avgSessionsPerWeek} sessions/week vs ${plannedDays} planned${skippedDays.length > 0 ? `\n  Most abandoned: ${[...new Set(skippedDays)].join(', ')}` : ''}`
  }

  const mealLogBlock = mealLogs.length > 0
    ? mealLogs.map(l => `${l.date} ${l.meal_time || ''}: ${l.description || 'logged'}${l.calories_estimated ? ` (~${l.calories_estimated} kcal` : ''}${l.protein_g ? `, ${l.protein_g}g protein` : ''}${l.calories_estimated ? ')' : ''}`).join('\n')
    : 'No recent meal logs.'

  const dietBlock = dietPlan
    ? `Daily targets: ${dietPlan.daily_calories} kcal | ${dietPlan.protein_g}g protein | ${dietPlan.carbs_g}g carbs | ${dietPlan.fat_g}g fat`
    : 'No diet plan yet.'

  const workoutBlock = workoutPlan
    ? JSON.stringify(workoutPlan, null, 2).slice(0, 2000)
    : 'No workout plan yet - encourage them to generate one.'

  // ── Calorie compliance analysis ──────────────────────────────────────────
  let complianceBlock = 'Not enough meal log data to assess compliance.'
  if (mealLogs.length > 0 && dietPlan?.daily_calories) {
    const dayCalMap: Record<string, number> = {}
    const dayProtMap: Record<string, number> = {}
    for (const l of mealLogs) {
      if (!l.date) continue
      dayCalMap[l.date] = (dayCalMap[l.date] || 0) + (l.calories_estimated || 0)
      dayProtMap[l.date] = (dayProtMap[l.date] || 0) + (l.protein_g || 0)
    }
    const calDays = Object.values(dayCalMap).filter(v => v > 0)
    const protDays = Object.values(dayProtMap).filter(v => v > 0)
    if (calDays.length > 0) {
      const avgCal = Math.round(calDays.reduce((a, b) => a + b, 0) / calDays.length)
      const avgProt = protDays.length > 0 ? Math.round(protDays.reduce((a, b) => a + b, 0) / protDays.length) : null
      const calDiff = avgCal - dietPlan.daily_calories
      const calStatus = Math.abs(calDiff) <= 100 ? 'ON TARGET' : calDiff > 0 ? `OVER by ${calDiff} kcal` : `UNDER by ${Math.abs(calDiff)} kcal`
      const protStatus = avgProt && dietPlan.protein_g
        ? (avgProt >= dietPlan.protein_g * 0.9 ? 'ON TARGET' : `UNDER — avg ${avgProt}g vs ${dietPlan.protein_g}g target`)
        : null
      complianceBlock = `Logged over ${calDays.length} day(s):
  Avg daily calories: ${avgCal} kcal (${calStatus})
  ${protStatus ? `Avg daily protein: ${avgProt}g (${protStatus})` : 'Protein: not enough data'}`
    }
  }

  // ── Weight trend vs expected rate of change ──────────────────────────────
  let trendBlock = 'Not enough measurements to compute trend.'
  if (measurements.length >= 2) {
    const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const oldest = sorted[0]
    const newest = sorted[sorted.length - 1]
    const daysDiff = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 0 && oldest.weight_kg && newest.weight_kg) {
      const totalChange = newest.weight_kg - oldest.weight_kg
      const weeklyRate = (totalChange / daysDiff) * 7
      const goal = profile?.goal || ''
      // Expected weekly rate by goal
      const expectedRate = goal === 'lose_fat' ? -0.5 : goal === 'build_muscle' ? 0.25 : goal === 'recomposition' ? 0 : null
      const rateStr = weeklyRate >= 0 ? `+${weeklyRate.toFixed(2)}` : weeklyRate.toFixed(2)
      trendBlock = `Over ${Math.round(daysDiff)} days: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)} kg total | ${rateStr} kg/week`
      if (expectedRate !== null) {
        const diff = weeklyRate - expectedRate
        if (Math.abs(diff) > 0.1) {
          trendBlock += `\n  Expected ~${expectedRate >= 0 ? '+' : ''}${expectedRate} kg/week for ${goal} — currently ${Math.abs(diff) > 0.2 ? 'SIGNIFICANTLY ' : ''}${diff > 0 ? 'FASTER' : 'SLOWER'} than expected`
        } else {
          trendBlock += `\n  On track for ${goal} goal`
        }
      }
    }
  }

  // ── Recent plan changes made via chat ────────────────────────────────────
  let planChangesBlock = 'No plan changes via chat yet.'
  if (recentPlanChanges.length > 0) {
    const lines = recentPlanChanges.map(c => {
      const date = new Date(c.created_at).toLocaleDateString('en-GB')
      const summary = c.metadata?.plan_edit?.summary || c.content?.slice(0, 120) || 'Change applied'
      const type = c.message_type === 'meal_card' ? '[DIET]' : '[WORKOUT]'
      return `${date} ${type}: ${summary}`
    })
    planChangesBlock = lines.join('\n')
  }

  return `You are Ion, an elite AI personal trainer and nutrition coach for SYNAP. You speak directly to ${profile?.name || 'your client'}.

${aiLanguageInstruction(language, 'every chat reply, coaching note, suggestion, plan-change summary, and structured-card text')}

TODAY: ${dateStr}
CLIENT TIER: ${planTier.toUpperCase()} plan

=== CLIENT PROFILE ===
${profileBlock}

=== LATEST BODY MEASUREMENTS ===
${measureBlock}

=== WEIGHT TREND ANALYSIS ===
${trendBlock}

=== CALORIE & PROTEIN COMPLIANCE (from meal logs) ===
${complianceBlock}

=== RECENT PLAN CHANGES (via chat) ===
${planChangesBlock}

=== WORKOUT COMPLIANCE ANALYSIS ===
${workoutComplianceBlock}

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
7a. Critical plan-save rule: In normal chat, NEVER claim a nutrition or workout plan has been saved, applied, or updated. Only the plan-edit handler can say that after a database update. If unsure, ask the user to confirm the exact meal/exercise change.
8. If the client is struggling or feeling demotivated, be honest and encouraging — no hollow praise. Name what's actually going well.
9. Language rule: If the saved client language is Arabic, ALWAYS reply in Arabic even if the user types English or Arabizi. If English, reply in English unless the user explicitly asks to switch.
10. Format rule: Return plain natural-language text only. Never wrap replies in JSON, markdown code fences, or code blocks.
11. Supplement rule: If CLIENT TIER is ELITE, you may give detailed personalised supplement protocols with timing, dosing, and stacking. For STARTER or PRO clients, acknowledge supplement questions briefly and let them know personalised protocols are available on the Elite plan — do not give a full protocol.
12. Data integrity rule: Never fabricate body metrics, food calories, exercise names, or plan data. If a data point is missing, say so clearly rather than estimating a number.
13. Billing rule: If the client asks about their subscription plan, pricing, upgrading, or cancelling, direct them politely to Settings → Billing. Do not discuss plan pricing or feature tiers in chat.
14. Goal timeline rule: If CLIENT TIER is ELITE, you may give a detailed month-by-month projection toward their goal based on current rate of change. For STARTER or PRO clients, give general progress encouragement only — no specific timeline projections.
15. Diet change tracking rule: When a diet change was made recently (see RECENT PLAN CHANGES), monitor whether it is working. Specifically: if the WEIGHT TREND ANALYSIS shows the client is slower than expected AFTER the change, flag it proactively — e.g. "Your calories were adjusted 2 weeks ago but you're still losing slower than target — let's check your actual calorie intake." If the change appears to be working, affirm it with data.
16. Calorie compliance rule: If CALORIE & PROTEIN COMPLIANCE shows the client is consistently UNDER or OVER their targets, proactively mention it with a concrete suggestion. Under by > 200 kcal → risk of muscle loss, suggest a specific food addition. Over by > 200 kcal → identify the likely source from meal logs, suggest a specific adjustment. Protein under 70% of target → prioritise fixing this above all else.
17. Diet change quality rule: When the client requests a diet change, evaluate whether it is beneficial for their goal BEFORE proposing it. If a change would clearly hurt their progress (e.g., removing their main protein source, cutting to < 1200 kcal, eliminating carbs pre-workout), explain why it is suboptimal and propose a better alternative that still respects their preference. Always coach, never just comply blindly.
18. Workout compliance rule: Use WORKOUT COMPLIANCE ANALYSIS proactively. If avg completion < 70% → ask what is causing sessions to be cut short before making any program changes (the problem may be time, fatigue, or motivation, not the exercises). If frequency is consistently below planned days → acknowledge it, dig into why, and offer to reschedule or simplify the program to match their real availability. Never silently accept low compliance.
19. Workout change quality rule: When the client requests a workout change, evaluate it against their goal and recovery capacity. Red flags to catch: removing all compound movements, reducing to < 2 days/week without a reason, adding volume when compliance is already poor, or training a muscle group that is injured. In these cases, explain the risk and propose a smarter alternative. If they want to swap an exercise, always suggest a movement that targets the same muscle with the same equipment they have.
20. Strength progress rule: If RECENT WORKOUT LOGS show duration consistently dropping (e.g., logging 30 min when 60 min is planned), or if the same exercises appear repeatedly without progression notes, flag it. A coach tracks strength progress — proactively ask if the client has been increasing weight/reps on their main lifts. If strength is stalling, suggest a deload or form focus week before increasing load.
21. InBody scan rule: If CLIENT PROFILE has no InBody scan data (body_fat_pct is absent or described as "estimated"), proactively mention once per conversation that uploading an InBody scan from Settings → Health will give Ion precise body fat %, muscle mass, and visceral fat — enabling exact protein targets (not population guesses). Do NOT repeat this every message. If InBody data IS present and shows visceral fat > 10 (high risk), proactively flag the cardiovascular risk and ensure the user understands why their plan prioritises fat loss. If InBody data was recently added (visible in profile block), acknowledge what changed: "Your InBody scan shows [X]% body fat and muscle mass of [Y] kg — your protein target has been updated to [Z]g based on your actual lean mass." Then offer to regenerate the plan for them if they want the full benefit: "Say 'regenerate my plan' and I'll rebuild it with your exact body composition."`
}

