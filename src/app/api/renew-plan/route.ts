import { NextResponse } from 'next/server'
import { createAdminClient, createRouteClient, getAuthenticatedUser } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { pushToUser } from '@/lib/push'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { withAnthropicRetry } from '@/lib/anthropic'
import { generateSupplementRecsIfElite } from '@/lib/supplement-gen'
import { calculateMacros, calculateWorkoutParams, equipmentString, machineIntelligenceRule } from '@/lib/plan-builder'
import { regionalFoodIntelligence } from '@/lib/regional-foods'
import { ramadanBlock } from '@/lib/ramadan'
import { normalizeWorkoutPlanDays } from '@/lib/workout-days'
import { recordAppEvent } from '@/lib/app-events'

// Renewal regenerates a full plan, same as generate-plan. 60 is the Vercel
// Hobby maximum. (On Vercel Pro you can raise this to 300.)
export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/renew-plan  — called when a user's plan cycle expires
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient(req)
    const admin    = createAdminClient()

    const { user, error: authError } = await getAuthenticatedUser(req)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'preview'

    if (action === 'apply') {
      return applyRenewalPreview({ supabase, admin, userId: user.id, email: user.email, previewId: body.previewId })
    }

    if (action === 'rollback') {
      return rollbackPlan({ admin, userId: user.id, planType: body.planType, targetPlanId: body.targetPlanId })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()

    const { planType }: { planType: 'diet' | 'workout' } = body
    if (!planType) return NextResponse.json({ error: 'Missing planType' }, { status: 400 })

    // Workout renewal is generated across WORKOUT_RENEWAL_PARTS phases so each
    // call fits under Vercel's 60s function cap on Opus. Diet ignores phase
    // (single call already fits). 1.0.1 clients that don't send `phase` fall
    // through to the legacy single-call path — best-effort, will time out for
    // workout on any high-quality model.
    //
    // The phase format is `workout-partN` where N is 1..WORKOUT_RENEWAL_PARTS.
    // Server-driven chaining: each response includes `next_phase` (or null
    // when complete), so clients follow the chain without knowing the part
    // count up front. This lets us bump WORKOUT_RENEWAL_PARTS without ever
    // needing another mobile rebuild.
    const phaseMatch = typeof body.phase === 'string' ? body.phase.match(/^workout-part(\d+)$/) : null
    const phasePartNumber = phaseMatch ? parseInt(phaseMatch[1], 10) : null
    const isValidPhase =
      planType === 'workout' &&
      phasePartNumber !== null &&
      phasePartNumber >= 1 &&
      phasePartNumber <= WORKOUT_RENEWAL_PARTS
    const phase = isValidPhase ? (body.phase as string) : undefined
    const partPreviewId: string | undefined = body.previewId

    // ── Phase 2+: merge new days into the existing preview ───────────────
    if (phase && phasePartNumber !== null && phasePartNumber >= 2) {
      if (!partPreviewId) {
        return NextResponse.json({ error: `${phase} requires previewId from part1` }, { status: 400 })
      }
      return generateWorkoutPartMerge({ admin, client, userId: user.id, previewId: partPreviewId, body, partNumber: phasePartNumber })
    }

    // Optional pre-renewal feedback the user supplied via the freshness gate.
    // For workout renewals: { lifts: [{name, weight_kg, reps}], flags: [...] }.
    // Saved into profile.strength_levels so future renewals also benefit, and
    // injected into the prompt so this rebuild starts at the right loads.
    const renewalContext: { lifts?: Array<{ name: string; weight_kg: number; reps: number }>; flags?: string[] } = body.context || {}
    if (planType === 'workout' && renewalContext.lifts?.length) {
      try {
        const updated: Record<string, string> = {}
        for (const l of renewalContext.lifts) {
          if (l?.name && Number.isFinite(l.weight_kg) && l.weight_kg > 0) {
            updated[l.name] = `${l.weight_kg}kg x ${Number.isFinite(l.reps) ? l.reps : 0}`
          }
        }
        if (Object.keys(updated).length) {
          await admin.from('profiles').update({ strength_levels: JSON.stringify(updated) }).eq('user_id', user.id)
        }
      } catch { /* non-fatal */ }
    }

    // ── Load everything in parallel ───────────────────────────────────
    const [profileRes, userLangRes, latestMeasRes, measureHistRes, oldPlanRes, subRes] = await Promise.all([
      admin.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('users').select('language').eq('id', user.id).maybeSingle(),
      // Latest measurement for LBM-based macro calculation
      admin.from('measurements')
        .select('weight_kg, body_fat_pct, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Last 5 measurements for progress context
      admin.from('measurements')
        .select('date, weight_kg, body_fat_pct, waist_cm')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5),
      admin.from(planType === 'diet' ? 'diet_plans' : 'workout_plans')
        .select('*').eq('user_id', user.id).eq('active', true).maybeSingle(),
      getUserSubscription(user.id),
    ])

    const profile            = profileRes.data
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const language           = normalizeAiLanguage(userLangRes.data?.language ?? profile?.language)
    const latestMeasurement  = latestMeasRes.data
    const measurementHistory = measureHistRes.data || []
    const oldPlan            = oldPlanRes.data?.plan_json
    const planTier           = effectivePlan(subRes)

    // ── Build progress summary ─────────────────────────────────────────
    const progressBlock = buildProgressBlock(measurementHistory)

    // ── Macro targets (same formula as initial generation) ────────────
    const m = calculateMacros(profile, latestMeasurement)
    const w = calculateWorkoutParams(profile)

    const dietPrefs   = Array.isArray(profile.dietary_preference) ? profile.dietary_preference : (profile.dietary_preference || '').split(',').filter(Boolean)
    const supplements = Array.isArray(profile.supplements) ? profile.supplements : (profile.supplements || '').split(',').filter(Boolean)

    // ── Build prompt ───────────────────────────────────────────────────
    // workoutPart: 0 = legacy single-call (for old clients), 1 = phased part 1.
    // Parts 2+ are handled by generateWorkoutPartMerge above.
    const workoutPart: 0 | 1 = planType === 'workout' && phase === 'workout-part1' ? 1 : 0
    const prompt = planType === 'diet'
      ? buildDietRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, dietPrefs, supplements, latestMeasurement })
      : buildWorkoutRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, renewalContext, workoutPart })

    // ── Call Claude ────────────────────────────────────────────────────
    // Diet single-call → Opus 4.5 (8000 tokens, fits 60s).
    // Workout phased → Opus 4.5 (each phase ~1000-1500 tokens).
    // Workout legacy single-call → Sonnet 4.6 best-effort (will time out).
    // All overridable via env so we can swap without redeploys.
    const planModel = planType === 'workout'
      ? (
          process.env.ANTHROPIC_RENEW_WORKOUT_MODEL ||
          process.env.ANTHROPIC_RENEW_MODEL ||
          (workoutPart === 1 ? 'claude-opus-4-5' : 'claude-sonnet-4-6')
        )
      : (process.env.ANTHROPIC_RENEW_DIET_MODEL || process.env.ANTHROPIC_RENEW_MODEL || process.env.ANTHROPIC_PLAN_MODEL || 'claude-opus-4-5')
    // Per-phase output budget. Workout part 1 emits plan metadata + ceil(N/4)
    // days only, so 3500 is generous; tighter than before because we're now
    // splitting into 4 phases instead of 3.
    const partMaxTokens = planType === 'diet'
      ? 8000
      : workoutPart === 1 ? 3500 : 9000

    const anthropicStartedAt = Date.now()
    const message = await withAnthropicRetry(() => client.messages.create({
      model: planModel,
      max_tokens: partMaxTokens,
      system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))
    const anthropicMs = Date.now() - anthropicStartedAt
    console.info('[renew-plan] anthropic', JSON.stringify({
      planType,
      phase: phase ?? 'legacy-single-call',
      model: message.model,
      ms: anthropicMs,
      input_tokens: message.usage?.input_tokens,
      output_tokens: message.usage?.output_tokens,
      stop_reason: message.stop_reason,
    }))

    await recordAiUsage({ userId: user.id, feature: `renew_plan_${planType}`, model: message.model, usage: message.usage })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse renewed plan' }, { status: 500 })
    let planJson = JSON.parse(match[0])

    // ── Post-process ───────────────────────────────────────────────────
    if (planType === 'workout') {
      planJson = normalizeWorkoutPlanDays(planJson)
      // Video IDs are resolved at APPLY time, not here. Enriching ~37 exercises
      // (each a network lookup) on top of the Opus(9000) workout generation
      // pushed this preview past the 60s Vercel ceiling — Vercel then returned
      // a plain-text timeout page, which the client's res.json() choked on
      // ("Unexpected token 'A', \"An error o\"..."). Diet has no video step and
      // stayed under budget, which is why only workout previews failed. Mark
      // exercises unresolved now; applyRenewalPreview() enriches before saving.
      for (const day of (planJson.days || [])) {
        for (const ex of (day.exercises || [])) {
          if (ex && typeof ex === 'object' && ex.video_id == null) ex.video_id = null
        }
      }
    }

    // ── Save ───────────────────────────────────────────────────────────
    const preview = buildRenewalPreview({
      planType,
      oldPlan,
      newPlan: planJson,
      progressBlock,
      language,
    })

    const { data: previewRow, error: previewError } = await admin.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: preview.message,
      message_type: 'text',
      metadata: {
        renewal_preview: true,
        pending_plan_json: planJson,
        pending_plan_type: planType,
        previous_plan_id: oldPlanRes.data?.id ?? null,
        preview,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        total_estimated_cost_usd: estimateRenewalCost(message),
        // Phased workout previews are only safe to apply after all parts merge.
        // Phase status values: 'awaiting_part2' → 'awaiting_part3' → 'complete'.
        // applyRenewalPreview rejects anything not 'complete'.
        phase_status: workoutPart === 1
          ? nextPhaseStatusAfter(1, profile)
          : 'complete',
        expected_training_days: planType === 'workout' ? Math.max(1, parseInt(profile.training_days || '4') || 4) : undefined,
      },
    }).select('id').single()

    if (previewError) throw previewError

    await recordAppEvent({
      userId: user.id,
      eventType: 'plan_renewal_preview_generated',
      source: 'renew-plan',
      message: `${planType} renewal preview generated`,
      metadata: { planType, previewId: previewRow?.id, cost: estimateRenewalCost(message) },
    })

    // For phased workout renewals, tell the client what to call next so it
    // can follow the chain without hard-coding the part count. Diet returns
    // no next_phase (single call).
    const nextPhase = workoutPart === 1 ? nextWorkoutPhase(1, profile) : null
    return NextResponse.json({
      ok: true,
      action: 'preview',
      previewId: previewRow?.id,
      preview,
      plan: planJson,
      next_phase: nextPhase,
      phase_status: workoutPart === 1 ? nextPhaseStatusAfter(1, profile) : 'complete',
    })
  } catch (err: any) {
    console.error('[renew-plan]', err)
    await recordAppEvent({
      eventType: 'plan_renewal_failed',
      severity: 'error',
      source: 'renew-plan',
      message: err?.message || 'Renewal failed',
    }).catch(() => {})
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Shared progress-summary builder used by both the main POST handler and the
// phase-2 worker. Pulled out of inline so both call sites stay consistent.
function buildProgressBlock(measurementHistory: any[]): string {
  if (measurementHistory.length >= 2) {
    return measurementHistory
      .map(m => `${m.date}: ${m.weight_kg}kg${m.body_fat_pct ? ` / ${m.body_fat_pct}%BF` : ''}${m.waist_cm ? ` / waist ${m.waist_cm}cm` : ''}`)
      .join('\n')
  }
  if (measurementHistory.length === 1) {
    return `${measurementHistory[0].date}: ${measurementHistory[0].weight_kg}kg (only 1 measurement — use as baseline)`
  }
  return 'No measurements recorded — keep macros at baseline targets'
}

// ── Phase 2 / 3 of workout renewal: generate remaining training days + merge ──
// Looks up the existing preview row, regenerates the prompt with the right
// workoutPart, merges the new days into pending_plan_json.days (dedup by
// canonical weekday), and flips phase_status to either 'awaiting_part3' (after
// part 2) or 'complete' (after part 3). applyRenewalPreview only accepts
// 'complete'.

async function generateWorkoutPartMerge({
  admin,
  client,
  userId,
  previewId,
  body,
  partNumber,
}: {
  admin: ReturnType<typeof createAdminClient>
  client: Anthropic
  userId: string
  previewId: string
  body: any
  partNumber: number
}) {
  const expectedPriorStatus = `awaiting_part${partNumber}`
  const partLabel = `part ${partNumber}`

  const { data: previewRow, error: lookupErr } = await admin.from('chat_messages')
    .select('id, metadata')
    .eq('id', previewId)
    .eq('user_id', userId)
    .eq('message_type', 'text')
    .contains('metadata', { renewal_preview: true })
    .maybeSingle()
  if (lookupErr) throw lookupErr
  if (!previewRow?.metadata?.pending_plan_json) {
    return NextResponse.json({ error: `Preview not found for ${partLabel}` }, { status: 404 })
  }
  if (previewRow.metadata.pending_plan_type !== 'workout') {
    return NextResponse.json({ error: 'Preview is not a workout renewal' }, { status: 400 })
  }
  // Idempotent: if the current preview is already at this phase status or past
  // it, return current state without re-generating. Avoids double charges on
  // client retries after a network blip.
  const currentStatus: string = previewRow.metadata.phase_status || 'complete'
  const currentAwaitingPart = currentStatus.startsWith('awaiting_part')
    ? parseInt(currentStatus.split('awaiting_part')[1], 10)
    : Infinity
  if (currentStatus === 'complete' || currentAwaitingPart > partNumber) {
    return NextResponse.json({
      ok: true,
      action: 'preview',
      previewId,
      preview: previewRow.metadata.preview,
      plan: previewRow.metadata.pending_plan_json,
      phase_status: currentStatus,
      next_phase: currentStatus === 'complete' ? null : `workout-part${currentAwaitingPart}`,
    })
  }
  if (currentStatus !== expectedPriorStatus) {
    return NextResponse.json({
      error: `Preview is in phase '${currentStatus}', expected '${expectedPriorStatus}' before ${partLabel}.`,
    }, { status: 409 })
  }

  // Rebuild context: same profile, measurements, params, renewalContext as
  // part 1. Flags/lifts are stable across all parts so they stay consistent
  // with part 1's load anchors.
  const renewalContext: { lifts?: Array<{ name: string; weight_kg: number; reps: number }>; flags?: string[] } = body.context || {}
  const [profileRes, userLangRes, latestMeasRes, measureHistRes, oldPlanRes] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('users').select('language').eq('id', userId).maybeSingle(),
    admin.from('measurements').select('weight_kg, body_fat_pct, date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('measurements').select('date, weight_kg, body_fat_pct, waist_cm').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    admin.from('workout_plans').select('*').eq('user_id', userId).eq('active', true).maybeSingle(),
  ])
  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const language = normalizeAiLanguage(userLangRes.data?.language ?? profile?.language)
  const latestMeasurement = latestMeasRes.data
  const measurementHistory = measureHistRes.data || []
  const oldPlan = oldPlanRes.data?.plan_json
  const m = calculateMacros(profile, latestMeasurement)
  const w = calculateWorkoutParams(profile)
  const progressBlock = buildProgressBlock(measurementHistory)
  const trainingDayCount = Math.max(1, parseInt(profile.training_days || '4') || 4)
  const splits = computeWorkoutPartSplits(trainingDayCount)
  const thisPartDays = splits[partNumber - 1] || 0

  // Compute downstream phase info ONCE so the no-op path and the LLM path
  // emit consistent next_phase / phase_status.
  const downstreamNextPhase = nextWorkoutPhase(partNumber, profile)
  const downstreamPhaseStatus = nextPhaseStatusAfter(partNumber, profile)

  // No-op phase: this partN has zero training days (small N). Skip Anthropic,
  // just flip the phase status forward.
  let merged = previewRow.metadata.pending_plan_json
  let messageUsageCost = 0
  if (thisPartDays > 0) {
    const prompt = buildWorkoutRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, renewalContext, workoutPart: partNumber })
    const planModel = process.env.ANTHROPIC_RENEW_WORKOUT_MODEL || process.env.ANTHROPIC_RENEW_MODEL || 'claude-opus-4-5'
    const anthropicStartedAt = Date.now()
    const message = await withAnthropicRetry(() => client.messages.create({
      model: planModel,
      max_tokens: 3000, // ~1-2 days of exercises; Opus needs headroom under 60s
      system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))
    const anthropicMs = Date.now() - anthropicStartedAt
    console.info('[renew-plan] anthropic', JSON.stringify({
      planType: 'workout',
      phase: `workout-part${partNumber}`,
      model: message.model,
      ms: anthropicMs,
      input_tokens: message.usage?.input_tokens,
      output_tokens: message.usage?.output_tokens,
      stop_reason: message.stop_reason,
    }))
    await recordAiUsage({ userId, feature: `renew_plan_workout_part${partNumber}`, model: message.model, usage: message.usage })
    messageUsageCost = estimateRenewalCost(message)

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const matchObj = raw.match(/\{[\s\S]*\}/)
    if (!matchObj) return NextResponse.json({ error: `Failed to parse ${partLabel} days` }, { status: 500 })
    let parsed: any
    try { parsed = JSON.parse(matchObj[0]) } catch {
      return NextResponse.json({ error: `${partLabel} returned invalid JSON` }, { status: 500 })
    }
    const newDays: any[] = Array.isArray(parsed?.days) ? parsed.days : []
    if (!newDays.length) {
      return NextResponse.json({ error: `${partLabel} returned no training days` }, { status: 500 })
    }

    // Merge: append any day whose canonical weekday isn't already in the plan.
    const existing: any[] = Array.isArray(merged?.days) ? [...merged.days] : []
    const dayKey = (d: any) => String(d?.day_name ?? d?.day ?? '').toLowerCase().trim()
    const seen = new Set(existing.map(dayKey).filter(Boolean))
    for (const d of newDays) {
      if (!d) continue
      if (Array.isArray(d.exercises)) {
        for (const ex of d.exercises) {
          if (ex && typeof ex === 'object' && ex.video_id == null) ex.video_id = null
        }
      }
      const k = dayKey(d)
      if (!k || seen.has(k)) continue
      existing.push(d)
      seen.add(k)
    }
    merged = normalizeWorkoutPlanDays({ ...merged, days: existing })
  }

  // Only rebuild the user-facing summary on the FINAL part. Intermediate parts
  // leave the existing preview text untouched so the user-visible message
  // isn't jittered between phases.
  const isFinal = downstreamNextPhase === null
  const refreshedPreview = isFinal
    ? buildRenewalPreview({ planType: 'workout', oldPlan, newPlan: merged, progressBlock, language })
    : previewRow.metadata.preview

  const newMetadata = {
    ...previewRow.metadata,
    pending_plan_json: merged,
    preview: refreshedPreview,
    phase_status: downstreamPhaseStatus,
    total_estimated_cost_usd: (previewRow.metadata.total_estimated_cost_usd || 0) + messageUsageCost,
  }
  const { error: updateErr } = await admin.from('chat_messages')
    .update({ content: isFinal ? refreshedPreview.message : (previewRow.metadata.preview?.message ?? null), metadata: newMetadata })
    .eq('id', previewId)
  if (updateErr) throw updateErr

  await recordAppEvent({
    userId,
    eventType: `plan_renewal_preview_part${partNumber}_merged`,
    severity: 'info',
    source: 'renew-plan',
    message: `Workout renewal ${partLabel} merged`,
    metadata: { previewId, totalDays: merged?.days?.length, expected: previewRow.metadata.expected_training_days, phase_status: downstreamPhaseStatus, no_op: thisPartDays === 0 },
  })

  return NextResponse.json({
    ok: true,
    action: 'preview',
    previewId,
    preview: refreshedPreview,
    plan: merged,
    phase_status: downstreamPhaseStatus,
    next_phase: downstreamNextPhase,
  })
}

async function applyRenewalPreview({
  supabase,
  admin,
  userId,
  email,
  previewId,
}: {
  supabase: Awaited<ReturnType<typeof createRouteClient>>
  admin: ReturnType<typeof createAdminClient>
  userId: string
  email?: string | null
  previewId?: string
}) {
  if (!previewId) return NextResponse.json({ error: 'Missing previewId' }, { status: 400 })

  const { data: previewRow, error } = await admin.from('chat_messages')
    .select('id, metadata, created_at')
    .eq('id', previewId)
    .eq('user_id', userId)
    .eq('message_type', 'text')
    .contains('metadata', { renewal_preview: true })
    .maybeSingle()

  if (error) throw error
  if (!previewRow?.metadata?.pending_plan_json) {
    return NextResponse.json({ error: 'Renewal preview not found' }, { status: 404 })
  }
  if (previewRow.metadata?.applied_at) {
    return NextResponse.json({ error: 'Renewal preview already applied' }, { status: 409 })
  }
  // Gate on any non-complete phase. Renewals are 3-phase for workouts; until
  // the merge of part 3 lands and flips phase_status='complete', the preview
  // can't be applied.
  const phaseStatus = previewRow.metadata?.phase_status
  if (phaseStatus && phaseStatus !== 'complete') {
    const nextPart = phaseStatus === 'awaiting_part2' ? 'Part 2' : phaseStatus === 'awaiting_part3' ? 'Part 3' : 'remaining parts'
    return NextResponse.json({ error: `Renewal preview is incomplete — ${nextPart} has not been generated yet.` }, { status: 409 })
  }

  const planType = previewRow.metadata.pending_plan_type as 'diet' | 'workout'
  if (planType !== 'diet' && planType !== 'workout') {
    return NextResponse.json({ error: 'Invalid renewal preview' }, { status: 400 })
  }

  const table = planType === 'diet' ? 'diet_plans' : 'workout_plans'
  // Cycle lengths: workout = 6 weeks, diet = 2 weeks.
  const durationWeeks = planType === 'diet' ? 2 : 6
  const startDate = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString().split('T')[0]
  const planJson = {
    ...previewRow.metadata.pending_plan_json,
    _renewal: {
      preview_id: previewId,
      previous_plan_id: previewRow.metadata.previous_plan_id ?? null,
      applied_at: new Date().toISOString(),
      summary: previewRow.metadata.preview ?? null,
    },
  }

  // Resolve exercise videos here (deferred from preview to keep the preview
  // call under the 60s ceiling). Apply is otherwise quick DB work, so the
  // ~37 parallel lookups fit comfortably. Only fills unresolved entries.
  if (planType === 'workout') {
    const allExercises: any[] = (planJson.days || []).flatMap((day: any) => day.exercises || [])
    await Promise.all(
      allExercises.map(async (ex: any) => {
        if (!ex || ex.video_id) return
        try {
          ex.video_id = await Promise.race([
            resolveExerciseVideo(ex.name),
            new Promise<null>(res => setTimeout(() => res(null), 10_000)),
          ])
        } catch { ex.video_id = null }
      })
    )
  }

  // Atomic swap: insert inactive first, then deactivate old, then activate new
  // — avoids a window where the user has zero active plans if insert fails
  const { data: insertedPlan, error: insertError } = await admin.from(table).insert({
    user_id: userId,
    plan_json: planJson,
    active: false,
    start_date: startDate,
    end_date: endDate,
  }).select('id, plan_json').single()
  if (insertError) throw insertError

  const { error: deactivateError } = await admin.from(table).update({ active: false }).eq('user_id', userId).eq('active', true)
  if (deactivateError) throw deactivateError

  const { error: activateError } = await admin.from(table).update({ active: true }).eq('id', insertedPlan.id).eq('user_id', userId)
  if (activateError) throw activateError

  const { data: profile } = await admin.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  const language = normalizeAiLanguage(profile?.language)
  const ionMessage = language === 'ar'
    ? `تم حفظ دورة ${planType === 'diet' ? 'التغذية' : 'التمرين'} الجديدة. إذا لم تناسبك، يمكنك الرجوع للخطة السابقة من صفحة الخطة.`
    : `Done. Your renewed ${planType === 'diet' ? 'nutrition' : 'workout'} cycle is now saved. If it feels wrong, you can restore the previous cycle from the Plan page.`

  await admin.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: ionMessage,
    message_type: 'text',
    metadata: { renewal_applied: true, plan_type: planType, plan_id: insertedPlan?.id },
  })

  const { error: markAppliedError } = await admin.from('chat_messages').update({
    metadata: {
      ...previewRow.metadata,
      applied_at: new Date().toISOString(),
      applied_plan_id: insertedPlan?.id,
    },
  }).eq('id', previewId)
  if (markAppliedError) throw markAppliedError

  await Promise.allSettled([
    email ? sendEmail({ to: email, type: 'new_plan', data: { name: profile?.name || 'there', planType, weeks: durationWeeks } }) : Promise.resolve(),
    pushToUser({ userId, type: 'plan_renewal' }),
  ])

  if (planType === 'diet' && process.env.ANTHROPIC_API_KEY) {
    generateSupplementRecsIfElite(
      supabase,
      new Anthropic(),
      userId,
      profile || {},
      insertedPlan?.plan_json,
      language,
    ).catch(e => console.error('[renew-plan] supplement gen failed:', e))
  }

  await recordAppEvent({
    userId,
    eventType: 'plan_renewal_applied',
    source: 'renew-plan',
    message: `${planType} renewal applied`,
    metadata: { planType, previewId, planId: insertedPlan?.id },
  })

  return NextResponse.json({ ok: true, action: 'apply', planType, plan: insertedPlan?.plan_json })
}

async function rollbackPlan({
  admin,
  userId,
  planType,
  targetPlanId,
}: {
  admin: ReturnType<typeof createAdminClient>
  userId: string
  planType?: 'diet' | 'workout'
  targetPlanId?: string
}) {
  if (planType !== 'diet' && planType !== 'workout') {
    return NextResponse.json({ error: 'Missing planType' }, { status: 400 })
  }

  const table = planType === 'diet' ? 'diet_plans' : 'workout_plans'

  const [currentRes, langRes] = await Promise.all([
    admin.from(table).select('id').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('profiles').select('language').eq('user_id', userId).maybeSingle(),
  ])

  const language = normalizeAiLanguage(langRes.data?.language)
  const ar = language === 'ar'

  // Keep targetBase as a query builder (not awaited) so we can conditionally chain .eq() or .order()
  const targetBase = admin.from(table).select('*').eq('user_id', userId).eq('active', false)
  const targetRes = targetPlanId
    ? await targetBase.eq('id', targetPlanId).maybeSingle()
    : await targetBase.order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (targetRes.error) throw targetRes.error
  if (!targetRes.data) return NextResponse.json({ error: 'No previous plan found' }, { status: 404 })

  if (currentRes.data?.id) {
    const { error } = await admin.from(table).update({ active: false }).eq('id', currentRes.data.id).eq('user_id', userId)
    if (error) throw error
  }

  const restoredPlanJson = {
    ...(targetRes.data.plan_json || {}),
    _restored: {
      restored_at: new Date().toISOString(),
      replaced_plan_id: currentRes.data?.id ?? null,
    },
  }

  const { error: restoreError } = await admin.from(table).update({
    active: true,
    plan_json: restoredPlanJson,
  }).eq('id', targetRes.data.id).eq('user_id', userId)
  if (restoreError) throw restoreError

  const rollbackMsg = ar
    ? (planType === 'diet'
        ? 'تم استعادة خطة التغذية السابقة. صفحة التغذية تستخدم تلك الدورة الآن.'
        : 'تم استعادة خطة التمرين السابقة. صفحة التمرين تستخدم تلك الدورة الآن.')
    : (planType === 'diet'
        ? 'I restored your previous nutrition plan. Your nutrition page now uses that cycle again.'
        : 'I restored your previous workout plan. Your workout pages now use that cycle again.')

  await admin.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: rollbackMsg,
    message_type: 'text',
    metadata: { rollback: true, plan_type: planType, restored_plan_id: targetRes.data.id, replaced_plan_id: currentRes.data?.id ?? null },
  })

  await recordAppEvent({
    userId,
    eventType: 'plan_rollback_applied',
    source: 'renew-plan',
    message: `${planType} plan rolled back`,
    metadata: { planType, restoredPlanId: targetRes.data.id, replacedPlanId: currentRes.data?.id ?? null },
  })

  return NextResponse.json({ ok: true, action: 'rollback', planType, restoredPlanId: targetRes.data.id, plan: restoredPlanJson })
}

function estimateRenewalCost(message: any) {
  const usage = message?.usage
  if (!usage) return 0
  const input = usage.input_tokens || 0
  const output = usage.output_tokens || 0
  const cacheWrite = usage.cache_creation_input_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0
  return input * 0.000015 + output * 0.000075 + cacheWrite * 0.00001875 + cacheRead * 0.0000015
}

function buildRenewalPreview({ planType, oldPlan, newPlan, progressBlock, language }: any) {
  const ar = language === 'ar'
  const oldCalories = oldPlan?.daily_calories ?? oldPlan?.calories_per_day
  const newCalories = newPlan?.daily_calories ?? newPlan?.calories_per_day
  const oldMacros = extractMacros(oldPlan)
  const newMacros = extractMacros(newPlan)
  const oldWorkout = extractWorkoutSummary(oldPlan)
  const newWorkout = extractWorkoutSummary(newPlan)
  const keyExerciseChanges = planType === 'workout' ? diffExercises(oldPlan, newPlan) : []

  const summary = {
    planType,
    calories: planType === 'diet' ? { before: oldCalories ?? null, after: newCalories ?? null } : null,
    macros: planType === 'diet' ? { before: oldMacros, after: newMacros } : null,
    trainingSplit: planType === 'workout' ? { before: oldWorkout.split, after: newWorkout.split } : null,
    daysPerWeek: planType === 'workout' ? { before: oldWorkout.daysPerWeek, after: newWorkout.daysPerWeek } : null,
    keyExerciseChanges,
    why: buildRenewalWhy(planType, progressBlock, ar),
  }

  const message = ar ? buildArabicPreviewMessage(summary) : buildEnglishPreviewMessage(summary)
  return { ...summary, message }
}

function extractMacros(plan: any) {
  if (!plan) return null
  const macros = plan.macros || plan
  return {
    protein_g: macros.protein_g ?? null,
    carbs_g: macros.carbs_g ?? null,
    fat_g: macros.fat_g ?? macros.fats_g ?? null,
  }
}

function extractWorkoutSummary(plan: any) {
  if (!plan) return { split: null, daysPerWeek: null }
  const days = Array.isArray(plan.days)
    ? plan.days
    : Array.isArray(plan.weeks)
      ? (plan.weeks[0]?.days || [])
      : []
  return {
    split: plan.split_type || plan.training_split || plan.program_type || plan.program_name || null,
    daysPerWeek: plan.training_days_per_week || days.filter((day: any) => (day.exercises || []).length > 0).length || null,
  }
}

function exerciseNames(plan: any) {
  const days = Array.isArray(plan?.days)
    ? plan.days
    : Array.isArray(plan?.weeks)
      ? plan.weeks.flatMap((week: any) => week.days || [])
      : []
  return days.flatMap((day: any) => (day.exercises || []).map((ex: any) => ex.name || ex.title).filter(Boolean))
}

function diffExercises(oldPlan: any, newPlan: any) {
  const oldNames = new Set(exerciseNames(oldPlan).map((name: string) => name.toLowerCase()))
  const added = exerciseNames(newPlan).filter((name: string) => !oldNames.has(name.toLowerCase()))
  return added.slice(0, 6)
}

function buildRenewalWhy(planType: string, progressBlock: string, ar: boolean) {
  const hasMeasurements = progressBlock && !progressBlock.startsWith('No measurements')
  if (ar) {
    return hasMeasurements
      ? `اعتمدت على القياسات الأخيرة، سجل التقدم، والخطة الحالية لتجديد ${planType === 'diet' ? 'التغذية' : 'التمرين'} بدون تغيير عشوائي.`
      : `لا توجد قياسات كافية، لذلك أبقيت التجديد محافظا ومبنيا على ملفك والخطة الحالية.`
  }
  return hasMeasurements
    ? `Based on recent measurements, progress trend, and your current plan, this renewal changes the next cycle without guessing.`
    : `Because there is limited measurement data, this renewal stays conservative and uses your profile plus the current plan as the baseline.`
}

function formatMacroLine(macros: any) {
  if (!macros) return 'not tracked'
  return `${macros.protein_g ?? '?'}g protein / ${macros.carbs_g ?? '?'}g carbs / ${macros.fat_g ?? '?'}g fat`
}

function buildEnglishPreviewMessage(summary: any) {
  const lines = [`Here is what will change before I save this ${summary.planType} renewal:`]
  if (summary.planType === 'diet') {
    lines.push(`Calories: ${summary.calories.before ?? '?'} -> ${summary.calories.after ?? '?'} kcal`)
    lines.push(`Macros: ${formatMacroLine(summary.macros.before)} -> ${formatMacroLine(summary.macros.after)}`)
  } else {
    lines.push(`Training split: ${summary.trainingSplit.before ?? '?'} -> ${summary.trainingSplit.after ?? '?'}`)
    lines.push(`Days/week: ${summary.daysPerWeek.before ?? '?'} -> ${summary.daysPerWeek.after ?? '?'}`)
    if (summary.keyExerciseChanges.length) lines.push(`Key exercise changes: ${summary.keyExerciseChanges.join(', ')}`)
  }
  lines.push(`Why: ${summary.why}`)
  lines.push('Reply or tap "Apply new plan" only if this looks right.')
  return lines.join('\n')
}

function buildArabicPreviewMessage(summary: any) {
  const lines = [`هذه معاينة ما سيتغير قبل حفظ تجديد ${summary.planType === 'diet' ? 'التغذية' : 'التمرين'}:`]
  if (summary.planType === 'diet') {
    lines.push(`السعرات: ${summary.calories.before ?? '?'} -> ${summary.calories.after ?? '?'} كالوري`)
    lines.push(`الماكروز: ${formatMacroLine(summary.macros.before)} -> ${formatMacroLine(summary.macros.after)}`)
  } else {
    lines.push(`تقسيم التمرين: ${summary.trainingSplit.before ?? '?'} -> ${summary.trainingSplit.after ?? '?'}`)
    lines.push(`أيام التمرين أسبوعيا: ${summary.daysPerWeek.before ?? '?'} -> ${summary.daysPerWeek.after ?? '?'}`)
    if (summary.keyExerciseChanges.length) lines.push(`أهم تغييرات التمارين: ${summary.keyExerciseChanges.join(', ')}`)
  }
  lines.push(`السبب: ${summary.why}`)
  lines.push('اضغط أو اكتب "طبق الخطة الجديدة" فقط إذا كانت مناسبة.')
  return lines.join('\n')
}

function buildDietRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, dietPrefs, supplements, latestMeasurement }: any) {
  const ar = language === 'ar'
  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Body Fat', build_muscle: 'Build Muscle & Strength',
    recomposition: 'Body Recomposition', improve_fitness: 'Improve General Fitness', be_healthier: 'Be Healthier',
  }
  const prevMacroSummary = oldPlan
    ? `Previous plan: ${oldPlan.daily_calories ?? '?'} kcal | ${oldPlan.protein_g ?? '?'}g protein | ${oldPlan.carbs_g ?? '?'}g carbs | ${oldPlan.fat_g ?? '?'}g fat`
    : 'No previous diet plan on record'

  return `You are Ion, a world-class AI nutritionist. Generate a RENEWED 2-week diet plan for this client based on their real progress.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan name, meal names, recipes, tips, and coaching notes')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Weight: ${latestMeasurement?.weight_kg || profile.weight_kg} kg | Height: ${profile.height_cm} cm
Goal: ${goalLabels[profile.goal] || profile.goal}
Goal speed: ${profile.goal_speed || 'moderate'}
LBM: ${m.leanMass} kg | Body fat: ${m.bodyFatPct}% (${m.usingRealBf ? 'measured via InBody scan' : 'estimated — no InBody scan'})${profile.muscle_mass_kg ? `\nSkeletal Muscle Mass (InBody): ${profile.muscle_mass_kg} kg` : ''}${profile.visceral_fat != null ? `\nVisceral Fat Level (InBody): ${profile.visceral_fat}${Number(profile.visceral_fat) > 10 ? ' ⚠️ HIGH — cardiovascular risk, prioritise fat loss' : ''}` : ''}${profile.inbody_score != null ? `\nInBody Score: ${profile.inbody_score}/100` : ''}${profile.bmr_kcal ? `\nMeasured BMR (InBody): ${profile.bmr_kcal} kcal/day` : ''}
Wake: ${profile.wake_time || '7:00'} | Sleep: ${profile.sleep_time || '23:00'}
Meals per day: ${profile.meals_per_day || 3} | Cooking: ${profile.cooking_ability || 'moderate'} | Budget: ${profile.food_budget || 'moderate'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUTRITION CONSTRAINTS — NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Foods LOVED (MUST appear in meals): ${profile.foods_loved || 'Not specified'}
Foods HATED (NEVER include): ${profile.foods_hated || 'None'}
Allergies (NEVER include): ${profile.allergies || 'None'}
Dietary restrictions: ${dietPrefs.join(', ') || 'None'}
Current supplements: ${supplements.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS & MEASUREMENT HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${progressBlock}
${prevMacroSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATED MACRO TARGETS (recalculated from latest measurements)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TDEE: ${m.tdee} kcal
Goal adjustment: ${profile.goal === 'lose_fat' ? `–${m.tdee - m.calories} kcal deficit (expected ${m.weeklyWeightChangeKg} kg/week)` : profile.goal === 'build_muscle' ? `+${m.calories - m.tdee} kcal surplus` : 'maintenance'}
→ daily_calories: ${m.calories} kcal
Protein: ${m.protein} g (${(m.protein / m.leanMass).toFixed(1)} g/kg LBM)
Fat:     ${m.fat} g
Carbs:   ${m.carbs} g
Water:   ${m.water} L/day

RENEWAL INSTRUCTIONS:
- Keep all food preferences EXACTLY as before — only adjust quantities and variety
- If progress is ahead of target (weight loss faster than expected), increase calories by ~100 kcal
- If progress is behind target, review protein first before cutting calories further
- Introduce meal variety — avoid repeating the same meals from the previous plan
- Meal timing: first meal ~1h after wake (${profile.wake_time || '7:00'}), last meal ≥1.5h before sleep (${profile.sleep_time || '23:00'})
- Pre-workout: 60–90 min before training, carb-focused, moderate protein, low fat
- Post-workout: within 45 min, high protein + carbs
- Every meal MUST include a food from "Foods LOVED" list
- Meal totals must sum to ±40 kcal of daily_calories
${ramadanBlock(profile)}
${regionalFoodIntelligence()}

Return ONLY valid JSON:
{
  "name": "Renewed plan name",
  "daily_calories": ${m.calories},
  "protein_g": ${m.protein},
  "carbs_g": ${m.carbs},
  "fat_g": ${m.fat},
  "water_l": ${m.water},
  "approach": "What changed vs previous cycle and why",
  "calorie_methodology": "Brief explanation of how ${m.calories} kcal was derived",
  "pre_workout": "Pre-workout timing and food",
  "post_workout": "Post-workout timing and food",
  "meals": [
    {
      "name": "Meal name",
      "time": "Time",
      "calories": 600,
      "protein_g": 40,
      "carbs_g": 70,
      "fat_g": 15,
      "description": "Why this meal works for this person",
      "recipe": {
        "title": "Recipe name",
        "prep_time_min": 5,
        "cook_time_min": 15,
        "ingredients": ["150g chicken breast", "80g basmati rice"],
        "steps": ["Step 1", "Step 2"],
        "tips": "Meal prep tip"
      },
      "foods": [{ "item": "Food", "amount": "Amount", "calories": 300, "protein_g": 10, "carbs_g": 55, "fat_g": 5 }]
    }
  ],
  "ion_message": "2-3 sentence personalised coaching message referencing actual progress numbers and what to focus on this cycle"
}`
}

// ── Workout renewal prompt ────────────────────────────────────────────────────

/** Total number of workout renewal phases. Each phase emits at most 2 training
 *  days so Opus stays comfortably under the 60s Vercel function cap. The 3-phase
 *  variant tipped 60s for at least one user; 4 phases is the safety margin.
 *  Bumpable to 5 or 6 here without any client change (clients follow the
 *  server-issued next_phase chain).
 */
const WORKOUT_RENEWAL_PARTS = 4

/** Distribute N training days across WORKOUT_RENEWAL_PARTS phases. Part 1
 *  carries the plan-level metadata so it gets a few more days when uneven.
 *  Formula generalises ceil-divide-remainder so it scales to any part count:
 *      part_i = ceil(remaining / (PARTS - i + 1))
 *  Result has WORKOUT_RENEWAL_PARTS entries; some may be 0 for small N (the
 *  caller treats 0-day phases as no-op merges that just flip the phase status
 *  forward).
 */
function computeWorkoutPartSplits(n: number): number[] {
  const splits: number[] = []
  let remaining = n
  for (let i = 0; i < WORKOUT_RENEWAL_PARTS; i++) {
    const slotsLeft = WORKOUT_RENEWAL_PARTS - i
    const days = i === 0
      ? Math.max(1, Math.ceil(remaining / slotsLeft))      // part 1 always ≥ 1
      : Math.max(0, Math.ceil(remaining / slotsLeft))
    splits.push(days)
    remaining = Math.max(0, remaining - days)
  }
  return splits
}

/** Given the splits, return the inclusive 1-based day-range for a part. */
function partDayRange(splits: number[], partNumber: number): { start: number; end: number; count: number } {
  let start = 1
  for (let i = 0; i < partNumber - 1; i++) start += splits[i] || 0
  const count = splits[partNumber - 1] || 0
  return { start, end: start + count - 1, count }
}

/** Return the next phase identifier the client should call after partN, or
 *  null when there are no more days to generate. Skips zero-day phases
 *  (small N where the tail parts have nothing to emit).
 */
function nextWorkoutPhase(currentPart: number, profile: any): string | null {
  const trainingDayCount = Math.max(1, parseInt(profile?.training_days || '4') || 4)
  const splits = computeWorkoutPartSplits(trainingDayCount)
  for (let p = currentPart + 1; p <= WORKOUT_RENEWAL_PARTS; p++) {
    if ((splits[p - 1] || 0) > 0) return `workout-part${p}`
  }
  return null
}

/** Return the phase_status value to store after partN. If no later non-empty
 *  parts remain, returns 'complete'. Otherwise returns 'awaiting_part{next}'.
 */
function nextPhaseStatusAfter(currentPart: number, profile: any): string {
  const next = nextWorkoutPhase(currentPart, profile)
  if (!next) return 'complete'
  const m = next.match(/^workout-part(\d+)$/)
  return m ? `awaiting_part${m[1]}` : 'complete'
}

function buildWorkoutRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, renewalContext, workoutPart = 0 }: any) {
  const ar = language === 'ar'
  const prevSplit = oldPlan?.split_type || 'unknown'
  const prevDays  = Array.isArray(oldPlan?.days) ? oldPlan.days.length : '?'

  // Workout renewal is split across WORKOUT_RENEWAL_PARTS (currently 4)
  // Anthropic calls. The full 6-week plan with ~28 detailed exercise blocks is
  // ~5-7k output tokens. Opus did ~70-90s in one shot, Sonnet ~50-65s; even
  // 2-phase Sonnet and 3-phase Opus tipped 60s. 4-phase Opus emits ~1000-1500
  // tokens per call (~20-30s) with comfortable headroom.
  //
  //   N=3 → 1/1/1/0, N=4 → 1/1/1/1, N=5 → 2/1/1/1, N=6 → 2/2/1/1
  const trainingDayCount = Math.max(1, parseInt(profile.training_days || '4') || 4)
  const partSplits = computeWorkoutPartSplits(trainingDayCount)
  const range = workoutPart >= 1 ? partDayRange(partSplits, workoutPart) : null

  let partInstruction = ''
  if (workoutPart >= 1 && range && range.count > 0) {
    const isFirst = workoutPart === 1
    const dayWord = range.count === 1 ? 'training day' : 'training days'
    const rangeLabel = range.count === 1
      ? `training day ${range.start}`
      : `training days ${range.start} through ${range.end}`
    partInstruction = isFirst
      ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSPLIT GENERATION — PART ${workoutPart} OF ${WORKOUT_RENEWAL_PARTS}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOutput plan-level fields (name, schedule, split_type, weeks, notes, progressive_overload, deload_weeks, deload_protocol, rest_days, ion_message) AND ONLY the FIRST ${range.count} ${dayWord} (the earliest ${range.count} weekday${range.count === 1 ? '' : 's'} of the ${w.splitType} split). Do NOT include the later ${trainingDayCount - range.count} training days — additional calls will generate those and the server will merge them in.\n`
      : `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSPLIT GENERATION — PART ${workoutPart} OF ${WORKOUT_RENEWAL_PARTS}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOutput ONLY ${rangeLabel} of the ${w.splitType} split (${range.count} ${dayWord}), continuing the SAME split so they fit seamlessly with the earlier parts. Use weekdays that do NOT overlap with previous parts. Return a JSON object with just { "days": [...] } — no plan-level fields, no ion_message, just the days array.\n`
  } else if (workoutPart >= 1 && range && range.count === 0) {
    // No-op phase (small training-day counts can leave the tail parts empty).
    // The handler will short-circuit before calling Anthropic, but we set an
    // instruction here for safety in case it's ever called directly.
    partInstruction = `\nThis split has no remaining training days for part ${workoutPart}. Return { "days": [] }.\n`
  }

  // Pre-renewal feedback the user supplied via the freshness gate. Use these
  // EXACT numbers as the starting loads for the new cycle; treat the flags as
  // hard constraints (Ion's job is to program around them, not ignore them).
  const liftsBlock = Array.isArray(renewalContext?.lifts) && renewalContext.lifts.length
    ? renewalContext.lifts
        .filter((l: any) => l?.name && Number.isFinite(l.weight_kg) && l.weight_kg > 0)
        .map((l: any) => `  ${l.name}: ${l.weight_kg}kg × ${Number.isFinite(l.reps) ? l.reps : '?'} reps (last working set)`)
        .join('\n')
    : ''
  const flagsBlock = Array.isArray(renewalContext?.flags) && renewalContext.flags.length
    ? renewalContext.flags.map((f: string) => `  - ${f}`).join('\n')
    : ''
  const renewalFeedbackBlock = (liftsBlock || flagsBlock)
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPRE-RENEWAL FEEDBACK (from the client, just now)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━${liftsBlock ? `\nLast working sets:\n${liftsBlock}\n→ Start the new cycle at these weights. Week 1 = these loads or +2.5kg (compounds) / +1kg (isolation). Do NOT reset to lighter starting weights "to be safe".` : ''}${flagsBlock ? `\nClient flags Ion must respect this cycle:\n${flagsBlock}\n→ Each flag is a HARD CONSTRAINT. Program around it (e.g. "shoulder pain" → swap overhead pressing for landmine press; "less time available" → cut session length by 20% and prioritise compounds; "want more cardio" → add 1 HIIT finisher per session).` : ''}\n`
    : ''

  return `You are Ion, a world-class AI personal trainer. Generate a RENEWED 6-week progressive workout programme for this client. This is their next training cycle — build on where they left off.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan name, session goals, exercise form tips, progression notes, and coaching notes')}
${partInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Goal: ${profile.goal} | Experience: ${profile.training_experience || 'intermediate'}
Training: ${profile.training_days} days/week | ${profile.session_duration} min/session | ${profile.training_time || 'evening'}
Gym access: ${profile.gym_access ? 'Yes' : 'No'} | Equipment: ${equipmentString(profile)}
Exercises NEVER to include: ${profile.exercises_hated || 'None'}
Injuries/limitations: ${profile.injuries || 'None'}
Stress: ${profile.stress_level || 'moderate'} | Sleep: ${profile.sleep_quality || 'average'}
Previous split: ${prevSplit} (${prevDays} training days)
Body composition: LBM ${m.leanMass} kg | BF% ${m.bodyFatPct}% (${m.usingRealBf ? 'InBody scan' : 'estimated'})${profile.muscle_mass_kg ? ` | Muscle mass ${profile.muscle_mass_kg} kg` : ''}${profile.visceral_fat != null ? ` | Visceral fat ${profile.visceral_fat}${Number(profile.visceral_fat) > 10 ? ' (HIGH)' : ''}` : ''}${profile.inbody_score != null ? ` | InBody score ${profile.inbody_score}/100` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${progressBlock}
${renewalFeedbackBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALCULATED WORKOUT PARAMETERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Experience tier:        ${w.expTier}
Recommended split:      ${w.splitType}
Volume:                 ${w.volumeNote}
Rep range — compounds:  ${w.reps.compounds}
Rep range — accessories: ${w.reps.accessories}
Rest — compounds:       ${w.restSec.compounds}s | accessories: ${w.restSec.accessories}s
Target RPE:             ${w.targetRPE}/10
Exercises/session:      ~${w.exercisesPerSession}
Progression model:      ${w.progressionModel}
Deload weeks:           Weeks ${w.deloadWeeks.join(', ')}
Intensity techniques:   ${w.intensityTechniques}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RENEWAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROGRESSION FROM PREVIOUS CYCLE:
   - Increase total weekly volume by ~10% vs previous cycle
   - If previous split was ${prevSplit}, either keep the same split with more volume OR progress to the next complexity tier if appropriate
   - Introduce exercise variation for secondary lifts (keep main compounds, swap 1-2 accessories)

2. EXERCISE SELECTION:
   Available equipment: ${equipmentString(profile)}
   NEVER use: ${profile.exercises_hated || 'none'} | Respect injuries: ${profile.injuries || 'none'}
   ${machineIntelligenceRule(profile, w)}

3. LOAD GUIDANCE:
   - Since this is a renewal, weight_guidance should reference progression FROM last cycle: "Start 2.5–5 kg heavier than your previous cycle's working weight" or give RPE ${w.targetRPE} guidance if no prior data
   - progression_note per exercise must be specific to this cycle's wave

4. GOAL FOCUS:
${profile.goal === 'lose_fat' ? `   - Higher reps (10–15), shorter rest (60s), include a 5-min metabolic finisher per session
   - Prioritise compound movements — no isolation-only days` : ''}
${profile.goal === 'build_muscle' ? `   - Hypertrophy rep ranges (6–12), full rest between sets
   - Compound lifts first with controlled eccentric. Mind-muscle connection cues.` : ''}
${profile.goal === 'recomposition' ? `   - Moderate reps (8–15), resistance training is the priority
   - Track and maintain or improve strength numbers to confirm muscle retention` : ''}

Return ONLY valid JSON:
{
  "name": "Renewed programme name",
  "schedule": "${profile.training_days} days/week",
  "split_type": "${w.splitType}",
  "experience_tier": "${w.expTier}",
  "weeks": 6,
  "notes": "What progressed from previous cycle and why this approach fits now",
  "progressive_overload": "${w.progressionModel}",
  "deload_weeks": [${w.deloadWeeks.map((d: number) => Math.min(d, 6)).filter((d: number, i: number, a: number[]) => a.indexOf(d) === i).join(', ')}],
  "deload_protocol": "On deload week: reduce sets to 50%, keep same weight, focus on form",
  "rest_days": ["rest day names"],
  "days": [
    {
      "day_name": "Monday",
      "muscle_focus": "Push / Upper / etc",
      "session_goal": "What this day optimises for",
      "warmup_min": 10,
      "warmup_exercises": ["Exercise 1", "Exercise 2"],
      "duration_min": ${profile.session_duration || 60},
      "exercises": [
        {
          "name": "Specific exercise name",
          "category": "compound / accessory / isolation",
          "sets": 4,
          "reps": "${w.reps.compounds}",
          "rest_sec": ${w.restSec.compounds},
          "weight_guidance": "Specific RPE or progression from previous cycle",
          "form_tip": "Single most important cue",
          "muscle_group": "Primary muscle",
          "progression_note": "How to progress this lift this cycle"
        }
      ],
      "cooldown_min": 5,
      "session_notes": "Recovery or technique note"
    }
  ],
  "ion_message": "2-3 sentence coaching message: what's progressing, what to focus on this cycle, reference actual progress if available"
}`
}
