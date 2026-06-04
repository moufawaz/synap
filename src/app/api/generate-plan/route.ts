import { createAdminClient, createRouteClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { recordAppEvent } from '@/lib/app-events'
import { sendPlanErrorEmailIfNeeded, sendPlanResolvedEmailIfNeeded } from '@/lib/plan-error-emails'
import { normalizeWorkoutPlanDays } from '@/lib/workout-days'
import { generateSupplementRecsIfElite } from '@/lib/supplement-gen'
import { calculateMacros, calculateWorkoutParams, equipmentString, machineIntelligenceRule } from '@/lib/plan-builder'

// Plan generation is a large Opus completion + YouTube enrichment. 60 is the
// Vercel Hobby maximum — give the function all the room the plan allows so it
// never gets cut short. (On Vercel Pro you can raise this to 300.)
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  // Guard: API key must be set
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    return NextResponse.json(
      { error: 'Ion is not configured. The ANTHROPIC_API_KEY environment variable is missing in your Vercel project settings.' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey })

  try {
    const body = await req.json()
    const { profileData } = body

    const supabase = await createRouteClient(req)
    const { user, error: authError } = await getAuthenticatedUser(req)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Rate limit: max 3 plan generations per user per 24 hours
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentGenerations } = await admin
      .from('workout_plans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since24h)
    if ((recentGenerations ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Plan generation limit reached. You can generate up to 3 plans per day. Try again tomorrow.' },
        { status: 429 }
      )
    }

    const [languageRow, latestMeasurementRow, measurementHistoryRow, profileRow] = await Promise.all([
      admin.from('users').select('language').eq('id', user.id).maybeSingle(),
      // Most recent measurement — used for LBM-based macro calculation
      admin.from('measurements')
        .select('weight_kg, body_fat_pct, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Last 5 measurements — trend context for the AI
      admin.from('measurements')
        .select('date, weight_kg, body_fat_pct, waist_cm')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5),
      // Full profile from DB — guarantees latest InBody scan data (body_fat_pct, muscle_mass_kg, visceral_fat, inbody_score, bmr_kcal)
      admin.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    const latestMeasurement = latestMeasurementRow.data
    const measurementHistory = measurementHistoryRow.data || []

    // Merge: DB profile wins over frontend payload for InBody fields so stale frontend data can't override fresh scan data
    const profileForPlan = {
      ...profileData,
      ...(profileRow.data ? {
        body_fat_pct:   profileRow.data.body_fat_pct,
        muscle_mass_kg: profileRow.data.muscle_mass_kg,
        bmr_kcal:       profileRow.data.bmr_kcal,
        visceral_fat:   profileRow.data.visceral_fat,
        inbody_score:   profileRow.data.inbody_score,
        inbody_url:     profileRow.data.inbody_url,
      } : {}),
      language: languageRow.data?.language ?? profileData?.language ?? 'en',
    }
    const prompt = buildPrompt(profileForPlan, latestMeasurement, measurementHistory)

    const message = await withAnthropicRetry(() => client.messages.create({
      model: process.env.ANTHROPIC_PLAN_MODEL || 'claude-opus-4-5',
      max_tokens: 16000,   // 8000 was too low; full plans with recipes easily exceed it
      system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))

    // Log finish_reason so truncation is visible in Vercel logs
    const finishReason = message.stop_reason
    console.info('[generate-plan] finish_reason:', finishReason, '| tokens:', message.usage)
    if (finishReason === 'max_tokens') {
      console.error('[generate-plan] Response was truncated; increase max_tokens further if this persists')
    }

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    await recordAiUsage({
      userId: user.id,
      feature: 'generate_plan',
      model: message.model,
      usage: message.usage,
    })

    // Extract JSON using multiple strategies in order
    let plan: any
    try {
      plan = extractJSON(rawContent)
      if (!plan) throw new Error('no valid JSON found')
      if (plan.workout_plan) {
        plan.workout_plan = normalizeWorkoutPlanDays(plan.workout_plan)
      }
    } catch {
      console.error('[generate-plan] JSON parse failed. finish_reason:', finishReason)
      console.error('[generate-plan] Invalid response length:', rawContent.length)
      await recordAppEvent({
        userId: user.id,
        eventType: 'plan_generation_failed',
        severity: 'error',
        source: 'api/generate-plan',
        message: 'Invalid JSON returned from plan generation',
        metadata: { finishReason, responseLength: rawContent.length },
      })
      if (user.email) {
        sendPlanErrorEmailIfNeeded(user.id, user.email, profileData?.name || 'Athlete').catch(() => {})
      }
      return NextResponse.json({ error: 'Ion returned an invalid plan format. Please try again.' }, { status: 500 })
    }

    // Enrich every exercise with a verified YouTube video ID
    // Run all lookups in parallel (static-map hits are instant; dynamic
    // searches run concurrently so the total wait is ~one search, not N).
    const allExercises: any[] = (plan.workout_plan?.days || []).flatMap(
      (day: any) => day.exercises || []
    )
    await Promise.all(
      allExercises.map(async (ex: any) => {
        try {
          ex.video_id = await Promise.race([
            resolveExerciseVideo(ex.name),
            new Promise<null>(res => setTimeout(() => res(null), 10_000)),
          ])
        } catch {
          ex.video_id = null
        }
      })
    )

    // Insert new plans first (inactive), then atomically activate them by
    // deactivating old plans only after both inserts succeed.
    // Store real cycle dates so the renewal warning + countdown work from the
    // first plan: workout cycle = 6 weeks, diet cycle = 2 weeks.
    const cycleStart   = new Date().toISOString().split('T')[0]
    const workoutEnd   = new Date(Date.now() + 6 * 7 * 86400000).toISOString().split('T')[0]
    const dietEnd      = new Date(Date.now() + 2 * 7 * 86400000).toISOString().split('T')[0]

    const { data: workoutPlan, error: wpError } = await supabase.from('workout_plans').insert({
      user_id: user.id,
      plan_json: plan.workout_plan,
      active: false,
      start_date: cycleStart,
      end_date: workoutEnd,
    }).select().maybeSingle()

    if (wpError) {
      console.error('Workout plan save error:', wpError)
      await recordAppEvent({
        userId: user.id,
        eventType: 'plan_generation_failed',
        severity: 'error',
        source: 'api/generate-plan',
        message: `Workout plan save failed: ${wpError.message}`,
      })
      if (user.email) {
        sendPlanErrorEmailIfNeeded(user.id, user.email, profileData?.name || 'Athlete').catch(() => {})
      }
      return NextResponse.json({ error: `Failed to save workout plan: ${wpError.message}` }, { status: 500 })
    }

    const { data: dietPlan, error: dpError } = await supabase.from('diet_plans').insert({
      user_id: user.id,
      plan_json: plan.diet_plan,
      active: false,
      start_date: cycleStart,
      end_date: dietEnd,
    }).select().maybeSingle()

    if (dpError) {
      console.error('Diet plan save error:', dpError)
      await recordAppEvent({
        userId: user.id,
        eventType: 'plan_generation_failed',
        severity: 'error',
        source: 'api/generate-plan',
        message: `Diet plan save failed: ${dpError.message}`,
      })
      if (user.email) {
        sendPlanErrorEmailIfNeeded(user.id, user.email, profileData?.name || 'Athlete').catch(() => {})
      }
      return NextResponse.json({ error: `Failed to save diet plan: ${dpError.message}` }, { status: 500 })
    }

    // Both rows saved — now safely swap: deactivate old, activate new
    await Promise.all([
      supabase.from('workout_plans').update({ active: false }).eq('user_id', user.id).neq('id', workoutPlan!.id),
      supabase.from('diet_plans').update({ active: false }).eq('user_id', user.id).neq('id', dietPlan!.id),
    ])
    await Promise.all([
      supabase.from('workout_plans').update({ active: true }).eq('id', workoutPlan!.id),
      supabase.from('diet_plans').update({ active: true }).eq('id', dietPlan!.id),
    ])

    // Save Ion's personal message as first chat message
    if (plan.ion_message) {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: plan.ion_message,
        message_type: 'text',
        metadata: {
          usage: {
            model: message.model,
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            cache_creation_input_tokens: message.usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: message.usage.cache_read_input_tokens || 0,
            estimated_cost_usd: estimateAnthropicCostUsd(message.usage, message.model),
            source: 'generate_plan',
          },
        },
      })
    }

    await recordAppEvent({
      userId: user.id,
      eventType: 'plan_generation_succeeded',
      severity: 'info',
      source: 'api/generate-plan',
      message: 'Plan generated and saved',
      metadata: { workout_plan_id: workoutPlan?.id, diet_plan_id: dietPlan?.id },
    })

    // Fire supplement + vitamin recommendations (Elite only, non-blocking)
    generateSupplementRecsIfElite(
      supabase,
      client,
      user.id,
      // Use measured BF% from latest measurement row if available; fall back to InBody profile value (never null it out)
      { ...profileForPlan, body_fat_pct: latestMeasurement?.body_fat_pct ?? profileForPlan.body_fat_pct },
      plan.diet_plan,
      normalizeAiLanguage(profileForPlan.language),
    ).catch(e => console.error('[generate-plan] supplement gen failed:', e))

    // Send post-generation email (fire-and-forget; do not block response).
    // If the user previously had a failed attempt, send the resolution email.
    // Otherwise send the standard welcome email.
    if (user.email) {
      sendPlanResolvedEmailIfNeeded(user.id, user.email, profileData.name || 'Athlete')
        .then((resolvedSent) => {
          if (!resolvedSent) {
            sendEmail({
              to: user.email!,
              type: 'welcome',
              data: { name: profileData.name || 'Athlete' },
            }).catch(() => {})
          }
        })
        .catch(() => {})
    }

    return NextResponse.json({
      success: true,
      workout_plan_id: workoutPlan?.id,
      diet_plan_id: dietPlan?.id,
    })
  } catch (err: any) {
    console.error('Generate plan error:', err?.message || err)
    try {
      const { user } = await getAuthenticatedUser(req)
      await recordAppEvent({
        userId: user?.id,
        eventType: 'plan_generation_failed',
        severity: 'error',
        source: 'api/generate-plan',
        message: err?.message || 'Unknown generate-plan error',
      })
      if (user?.id && user?.email) {
        sendPlanErrorEmailIfNeeded(user.id, user.email, 'Athlete').catch(() => {})
      }
    } catch {}
    const raw = err?.message || ''
    let friendly = "Ion couldn't build your plan right now. Please try again."
    if (raw.includes('credit balance') || raw.includes('billing') || raw.includes('quota')) {
      friendly = "Plan generation is temporarily unavailable. Please try again shortly."
    } else if (raw.includes('overloaded') || raw.includes('rate_limit')) {
      friendly = "Ion is busy right now. Wait a moment and try again."
    }
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}

// JSON extraction with multiple strategies
function extractJSON(raw: string): any {
  // 1. Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  // 2. Direct parse (ideal: model returned pure JSON)
  try { return JSON.parse(stripped) } catch {}

  // 3. Find the outermost { ... } block by tracking bracket depth
  //    This handles text before/after the JSON object.
  const start = stripped.indexOf('{')
  if (start !== -1) {
    let depth = 0
    let inString = false
    let escaped  = false
    for (let i = start; i < stripped.length; i++) {
      const ch = stripped[i]
      if (escaped)            { escaped = false; continue }
      if (ch === '\\')        { escaped = true;  continue }
      if (ch === '"')         { inString = !inString; continue }
      if (inString)           { continue }
      if (ch === '{')         { depth++ }
      if (ch === '}')         { depth--
        if (depth === 0) {
          try { return JSON.parse(stripped.slice(start, i + 1)) } catch {}
          break  // found the closing brace but it is still invalid; give up
        }
      }
    }
  }

  // 4. If truncated (max_tokens hit), attempt recovery by closing open brackets
  try {
    const recovered = repairTruncatedJSON(stripped.slice(stripped.indexOf('{')))
    if (recovered) return JSON.parse(recovered)
  } catch {}

  return null
}

/** Close any unclosed brackets/braces so a truncated JSON can be parsed. */
function repairTruncatedJSON(s: string): string | null {
  try {
    // Remove trailing partial string / comma / whitespace
    const trimmed = s.replace(/,\s*$/, '').replace(/"[^"]*$/, '"TRUNCATED"').trim()
    const stack: string[] = []
    let inString = false
    let escaped  = false
    for (const ch of trimmed) {
      if (escaped)            { escaped = false; continue }
      if (ch === '\\')        { escaped = true;  continue }
      if (ch === '"')         { inString = !inString; continue }
      if (inString)           { continue }
      if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
      if (ch === '}' || ch === ']') stack.pop()
    }
    return trimmed + stack.reverse().join('')
  } catch {
    return null
  }
}

// calculateMacros and calculateWorkoutParams are imported from @/lib/plan-builder

function buildPrompt(p: any, latestMeasurement?: any, measurementHistory?: any[]): string {
  const language = normalizeAiLanguage(p.language)
  const m = calculateMacros(p, latestMeasurement)
  const w = calculateWorkoutParams(p)
  const ar = language === 'ar'

  const goalLabels: Record<string, string> = {
    lose_fat:       'Lose Body Fat',
    build_muscle:   'Build Muscle & Strength',
    recomposition:  'Body Recomposition (simultaneous fat loss + muscle gain)',
    improve_fitness:'Improve General Fitness & Endurance',
    be_healthier:   'Improve Overall Health & Wellbeing',
  }

  // Build a measurement history block if we have data
  const measureBlock = (measurementHistory && measurementHistory.length > 0)
    ? measurementHistory.map(m =>
        `  ${m.date}: ${m.weight_kg}kg${m.body_fat_pct ? ` / ${m.body_fat_pct}% BF` : ''}${m.waist_cm ? ` / waist ${m.waist_cm}cm` : ''}`
      ).join('\n')
    : '  No measurement history — this is the user\'s first plan.'

  // Dietary restrictions as a hard list
  const dietPrefs = Array.isArray(p.dietary_preference)
    ? p.dietary_preference : (p.dietary_preference || '').split(',').filter(Boolean)
  const supplements = Array.isArray(p.supplements)
    ? p.supplements : (p.supplements || '').split(',').filter(Boolean)

  // The workout cycle is 6 weeks — clamp deload weeks (which default to a 12-week
  // schedule) into the 6-week window and de-dupe.
  const deload6 = w.deloadWeeks.map((d: number) => Math.min(d, 6)).filter((d: number, i: number, a: number[]) => a.indexOf(d) === i)

  return `You are Ion, a world-class AI personal trainer and clinical nutritionist. Build a complete, hyper-personalised 6-week fitness and nutrition plan for this specific client.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan names, meal names, recipes, exercise tips, coaching notes, summaries, and ion_message')}

????????????????????????????
COMPLETE CLIENT PROFILE
????????????????????????????
Name: ${p.name} | Age: ${p.age} | Gender: ${p.gender}
Weight: ${latestMeasurement?.weight_kg || p.weight_kg} kg | Height: ${p.height_cm} cm
Goal: ${goalLabels[p.goal] || p.goal}
Target: ${p.goal_target || 'Not specified'} | Deadline: ${p.goal_date || 'No deadline set'}
Goal speed: ${p.goal_speed || 'moderate'}

BODY COMPOSITION (InBody scan data — use this instead of population defaults):
  Lean Body Mass: ${m.leanMass} kg
  Body fat: ${m.bodyFatPct}% (${m.usingRealBf ? 'measured via InBody scan — use this value' : 'estimated default — no InBody scan on file'})${p.muscle_mass_kg ? `
  Skeletal Muscle Mass (InBody): ${p.muscle_mass_kg} kg` : ''}${p.visceral_fat != null ? `
  Visceral Fat Level (InBody): ${p.visceral_fat}${Number(p.visceral_fat) > 10 ? ' ?? HIGH — above safe threshold of 10, elevated cardiovascular risk. Include cardiovascular health foods and prioritise fat loss.' : Number(p.visceral_fat) > 7 ? ' (moderate — monitor)' : ' (healthy range)'}` : ''}${p.inbody_score != null ? `
  InBody Score: ${p.inbody_score}/100${Number(p.inbody_score) < 60 ? ' — well below average, prioritise body recomposition' : Number(p.inbody_score) < 75 ? ' — below average' : Number(p.inbody_score) >= 85 ? ' — above average, good foundation' : ''}` : ''}${p.bmr_kcal ? `
  Measured BMR (InBody device): ${p.bmr_kcal} kcal/day (use this as the baseline BMR if it significantly differs from Mifflin-St Jeor)` : ''}

MEASUREMENT HISTORY:
${measureBlock}

LIFESTYLE & SCHEDULE:
  Wake: ${p.wake_time || '7:00'} | Sleep: ${p.sleep_time || '23:00'}
  Work: ${p.work_schedule || 'standard'} | Stress: ${p.stress_level || 'moderate'}
  Sleep quality: ${p.sleep_quality || 'average'} | Lunch break: ${p.lunch_break || 'flexible'}

TRAINING:
  Location: ${p.gym_access ? 'Gym' : 'Home'} | Equipment: ${Array.isArray(p.equipment) ? p.equipment.join(', ') : p.equipment || (p.gym_access ? 'Full gym' : 'Bodyweight only')}
  Days/week: ${p.training_days} | Session: ${p.session_duration} min | Preferred time: ${p.training_time || 'morning'}
  Experience: ${p.currently_training === 'already' ? 'Currently training' : 'Beginner / returning'} | Style: ${p.training_style || 'mix'}
  Exercises to NEVER program: ${p.exercises_hated || 'None'}
  Injuries: ${p.injuries || 'None'} | Medical: ${p.medical_conditions || 'None'}
  Strength levels: ${p.strength_levels || 'Not provided'}

????????????????????????????
NUTRITION PROFILE — READ CAREFULLY
????????????????????????????
Foods LOVED (MUST appear in meals): ${p.foods_loved || 'Not specified — use common whole foods'}
Foods HATED (NEVER include): ${p.foods_hated || 'None'}
Allergies (NEVER include — safety critical): ${p.allergies || 'None'}
Dietary restrictions: ${dietPrefs.join(', ') || 'None'}
Meals per day: ${p.meals_per_day || 3}
Cooking ability: ${p.cooking_ability || 'moderate'} | Budget: ${p.food_budget || 'moderate'}
Current supplements: ${supplements.join(', ') || 'None'}

????????????????????????????
CALCULATED MACRO TARGETS
(derived from LBM + TDEE formula below — adjust ±5% if strongly justified)
????????????????????????????
TDEE: ${m.tdee} kcal/day
Goal adjustment: ${p.goal === 'lose_fat' ? `–${m.tdee - m.calories} kcal deficit (${m.weeklyWeightChangeKg} kg/week expected loss)` : p.goal === 'build_muscle' ? `+${m.calories - m.tdee} kcal surplus (lean gain)` : 'maintenance'}
? daily_calories: ${m.calories} kcal

Protein: ${m.protein} g  (${(m.protein / m.leanMass).toFixed(1)} g/kg LBM — LBM-based, not total weight)
Fat:     ${m.fat} g  (27% of calories for hormonal health)
Carbs:   ${m.carbs} g  (fills remaining energy after protein + fat)
Water:   ${m.water} L/day

METHODOLOGY:
- BMR = Mifflin-St Jeor using ${latestMeasurement?.weight_kg || p.weight_kg} kg
- TDEE = BMR × ${p.work_schedule?.includes('shift') ? '1.5' : '1.4'} NEAT + ${Math.round(parseInt(p.training_days || '3') * parseInt(p.session_duration || '60') * 5 / 7)} kcal/day training burn
- Protein set at ${(m.protein / m.leanMass).toFixed(1)} g/kg LBM (lean body mass = ${m.leanMass} kg)
- Protein from TOTAL weight = ${(m.protein / (parseFloat(latestMeasurement?.weight_kg || p.weight_kg) || 70)).toFixed(1)} g/kg — verify this is reasonable (2.0 g/kg total weight is the MAX)
- Fat floored at 27% of calories for hormone production
- Meal totals MUST sum to ±40 kcal of daily_calories target

????????????????????????????
DIET PLAN BUILDING RULES
????????????????????????????
1. PERSONALISATION — this is not a generic plan:
   - Every meal must contain at least one food from the "Foods LOVED" list
   - Zero exceptions: never include foods from "Foods HATED" or "Allergies"
   - Recipes must match cooking ability (${p.cooking_ability || 'moderate'})
   - Ingredient costs must align with budget (${p.food_budget || 'moderate'})

2. MEAL TIMING — built around the user's real day:
   - First meal ˜ 1 hour after wake (${p.wake_time || '7:00'})
   - Last meal = 1.5 hours before sleep (${p.sleep_time || '23:00'})
   - Pre-workout meal: ~60–90 min before training, rich in carbs + moderate protein, low fat
   - Post-workout meal: within 45 min, high protein + carbs, low fat
   - Meals spaced ~${Math.max(2, Math.round(14 / (parseInt(p.meals_per_day || '3'))))} hours apart

3. MACRO DISTRIBUTION — NOT uniform:
   - Higher carbs before and after training; lower carbs in evening
   - Fat distributed away from workout windows
   - Each meal should hit its micro-targets for this specific day's energy needs

4. MICRONUTRIENTS — whole food first, not supplements:
   - Ensure variety of vegetables across meals (minimum 2 different veg per day)
   - Include iron sources if female or if intense training
   - Ensure omega-3 sources (oily fish, walnuts, chia) unless allergic
   - If vegan/vegetarian: explicitly include B12, zinc, and calcium sources

5. RECIPE QUALITY:
   - Every meal must have a recipe with realistic steps and exact gram amounts
   - Ingredients must be specific: "150g boneless chicken breast" not "chicken"
   - Steps must be practical for the user's cooking level
   - Include meal prep tips for batch cooking

6. GOAL-SPECIFIC FOCUS:
${p.goal === 'lose_fat' ? `   - Calorie accuracy is critical — meal totals MUST match targets
   - Prioritise high-volume low-calorie foods for satiety (vegetables, lean protein)
   - Include a note on flexible eating / calorie cycling if appropriate
   - Flag that scale fluctuations ±1kg are water and not fat — reassure the user` : ''}
${p.goal === 'build_muscle' ? `   - Sufficient carbs to fuel training and recovery
   - Post-workout meal is the highest priority meal of the day
   - Include calorie-dense options for the surplus (nuts, oats, whole milk, avocado)
   - Protein spread across ALL meals (minimum 25g per meal)` : ''}
${p.goal === 'recomposition' ? `   - Calorie cycling: slightly higher on training days, maintenance on rest
   - Protein at every meal is non-negotiable for simultaneous fat loss + muscle retention
   - Carb timing is critical — carbs mostly around training` : ''}

????????????????????????????
WORKOUT PLAN BUILDING RULES
????????????????????????????
CALCULATED WORKOUT PARAMETERS (derived — adjust only if strongly justified):
  Experience tier:        ${w.expTier}
  Recommended split:      ${w.splitType}
  Volume target:          ${w.volumeNote}
  Rep range — compounds:  ${w.reps.compounds} reps
  Rep range — accessories: ${w.reps.accessories} reps
  Rest — compounds:       ${w.restSec.compounds}s
  Rest — accessories:     ${w.restSec.accessories}s
  Target RPE:             ${w.targetRPE}/10 (adjusted for stress: ${p.stress_level || 'moderate'}, sleep: ${p.sleep_quality || 'average'})
  Exercises per session:  ~${w.exercisesPerSession} (for ${p.session_duration || 60} min)
  Deload weeks:           Weeks ${deload6.join(", ")}

1. SPLIT & STRUCTURE:
   - Use the ${w.splitType} split — it is the evidence-based optimal choice for ${p.training_days} days/week at this experience level
   - Each day must start with 1–2 compound movements (squat, hinge, press, or row patterns)
   - Accessory work follows compounds; isolation exercises come last
   - Session order: warm-up ? compounds ? accessories ? isolation ? cool-down
   - Each session must fit within ${p.session_duration || 60} min total

2. EXERCISE SELECTION — NON-NEGOTIABLE:
   Available equipment: ${equipmentString(p)}
   NEVER use: ${p.exercises_hated || 'None'} | Design around injuries: ${p.injuries || 'None'}

   ${machineIntelligenceRule(p, w)}
   - Balance left/right — if unilateral exercises are used, both sides must be trained equally

3. LOAD & INTENSITY:
   - weight_guidance must be specific and usable:
     - If strength_levels are provided (${p.strength_levels || 'not provided'}): use percentages of stated maxes or provide a relative load
     - If no strength data: give RPE-based guidance (e.g., "Start at RPE ${w.targetRPE} — a weight where you have ${10 - w.targetRPE} reps left in the tank")
     - For beginners: always give a safe starter weight range (e.g., "10–15 kg")
   - form_tip must be the single most important cue for THIS exercise, not a generic safety warning

4. PROGRESSIVE OVERLOAD — EXPLICIT WEEK-BY-WEEK MODEL:
   ${w.progressionModel}
   - Include deload protocol for weeks ${deload6.join(", ")}: reduce to 50% of normal volume, keep intensity same, prioritise recovery
   - The progressive_overload field in JSON must spell out EXACTLY how to progress (not just "add weight")

5. INTENSITY TECHNIQUES:
   ${w.intensityTechniques}

6. RECOVERY & SESSION DESIGN:
   - Never schedule 3+ consecutive training days without a rest day
   - If training_time is morning (${p.training_time || 'morning'}): include a proper warm-up (activation exercises)
   - Sleep quality is ${p.sleep_quality || 'average'} — ${p.sleep_quality === 'poor' ? 'keep volume on the lower end of range; skip high-intensity finishers' : 'normal volume is appropriate'}
   - Stress level is ${p.stress_level || 'moderate'} — ${(p.stress_level === 'high' || p.stress_level === 'very_high') ? 'reduce CNS-intensive exercises; prioritise controlled, moderate-intensity work' : 'standard intensity applies'}

7. GOAL-SPECIFIC WORKOUT FOCUS:
${p.goal === 'lose_fat' ? `   - Prioritise compound movements for metabolic effect — no isolation-only days
   - Include a 5-min metabolic finisher at the END of each session (e.g., 3 rounds: 15 goblet squats + 15 cable rows + 12 dumbbell thrusters) — this maximises calorie burn without adding session length
   - Do not create one combined exercise named "metabolic finisher" or "circuit". Add each finisher movement as its own exercise object so every movement gets the correct tutorial video.
   - Higher rep ranges (10–15) build more lactate and burn more total calories — lean into the upper end of the rep range
   - Rest 60s between sets to keep heart rate elevated; only extend rest if form breaks down
   - Cardio is separate from resistance training unless HIIT is the stated training_style` : ''}
${p.goal === 'build_muscle' ? `   - Hypertrophy rep ranges (6–12) with strict form — ego lifting defeats the purpose
   - Mind-muscle connection cues in every form_tip
   - Compound lifts first, heavy and controlled; accessories with controlled eccentric
   - Adequate rest between sets is non-negotiable for quality work — do NOT compress rest to fit more exercises` : ''}
${p.goal === 'recomposition' ? `   - Resistance training is the priority — cardio is secondary and must not compromise strength sessions
   - Moderate rep ranges (8–15) with moderate load — enough stimulus for muscle retention
   - Full-body or upper-lower splits maximise frequency; avoid single-muscle-group days
   - Track strength numbers — maintaining or increasing strength while in deficit = muscle being preserved` : ''}
${p.goal === 'improve_fitness' || p.goal === 'be_healthier' ? `   - Balance resistance training, mobility, and cardiovascular health
   - Include at least one full-body circuit or conditioning session per week
   - Emphasise movement quality over load — especially for beginners
   - Include active recovery or flexibility work on lighter days` : ''}

IMPORTANT: Respond with ONLY valid JSON. No markdown fences, no extra text.
JSON key names must stay exactly as shown. For workout day_name, ALWAYS use English weekdays (Sunday–Saturday) even for Arabic users — only translate user-facing display strings.

{
  "summary": "3-sentence personalised overview: what the approach is, why it fits this person, what result to expect in 6 weeks",
  "workout_plan": {
    "name": "Plan name reflecting goal and split",
    "schedule": "${p.training_days} days/week",
    "split_type": "${w.splitType}",
    "experience_tier": "${w.expTier}",
    "weeks": 6,
    "notes": "2–3 sentences on why this split and approach fits this specific person's goal, experience, and schedule",
    "progressive_overload": "${w.progressionModel}",
    "deload_weeks": [${deload6.join(", ")}],
    "deload_protocol": "On deload weeks: reduce sets by 50%, keep same weight, focus on form and recovery",
    "rest_days": ["list of rest day names"],
    "days": [
      {
        "day_name": "Monday",
        "muscle_focus": "Push / Upper / Full Body / etc",
        "session_goal": "One sentence: what this day is optimising for",
        "warmup_min": 10,
        "warmup_exercises": ["Hip circles 2x10", "Band pull-aparts 2x15", "etc"],
        "duration_min": ${p.session_duration || 60},
        "exercises": [
          {
            "name": "Specific exercise name (e.g. Barbell Back Squat)",
            "category": "compound / accessory / isolation / cardio",
            "sets": 4,
            "reps": "${w.reps.compounds}",
            "rest_sec": ${w.restSec.compounds},
            "weight_guidance": "RPE ${w.targetRPE} or specific kg range based on strength_levels — be concrete",
            "form_tip": "The single most important cue for this exercise",
            "muscle_group": "Primary muscle targeted",
            "progression_note": "How to progress THIS specific exercise (e.g. 'Add 2.5kg when all ${w.reps.compounds} reps are clean')"
          }
        ],
        "cooldown_min": 5,
        "session_notes": "Recovery or technique focus for this day"
      }
    ]
  },
  "diet_plan": {
    "daily_calories": ${m.calories},
    "protein_g": ${m.protein},
    "carbs_g": ${m.carbs},
    "fat_g": ${m.fat},
    "water_l": ${m.water},
    "approach": "Specific caloric strategy for this goal (e.g. 400 kcal deficit via high-protein, food-variety approach)",
    "calorie_methodology": "Brief explanation of how the ${m.calories} kcal target was derived for this user",
    "pre_workout": "Exact meal timing and food composition for pre-workout nutrition",
    "post_workout": "Exact meal timing and food composition for post-workout recovery",
    "meals": [
      {
        "name": "Meal name matching the user's preference",
        "time": "Time matching wake/sleep/workout schedule",
        "calories": 600,
        "protein_g": 40,
        "carbs_g": 70,
        "fat_g": 15,
        "description": "Why this meal works for this specific person at this time",
        "recipe": {
          "title": "Recipe name",
          "prep_time_min": 5,
          "cook_time_min": 15,
          "ingredients": ["150g boneless chicken breast", "80g basmati rice (dry)", "100g broccoli"],
          "steps": ["Practical step 1", "Practical step 2", "Practical step 3"],
          "tips": "Meal-prep or substitution tip for this user"
        },
        "foods": [
          {
            "item": "Specific food with brand/type if relevant",
            "amount": "Exact weight or portion",
            "calories": 300,
            "protein_g": 10,
            "carbs_g": 55,
            "fat_g": 5
          }
        ]
      }
    ]
  },
  "ion_message": "Warm, direct, personal 3-4 sentence message from Ion. Reference the client's name, their specific goal target, one thing from their food preferences, and what to expect. Sound like a real elite coach."
}`
}
