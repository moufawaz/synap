import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { withAnthropicRetry } from '@/lib/anthropic'
import { estimateAnthropicCostUsd } from '@/lib/token-cost'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { recordAppEvent } from '@/lib/app-events'
import { normalizeWorkoutPlanDays } from '@/lib/workout-days'
import { generateSupplementRecsIfElite } from '@/lib/supplement-gen'

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

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const [languageRow, latestMeasurementRow, measurementHistoryRow] = await Promise.all([
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
    ])

    const latestMeasurement = latestMeasurementRow.data
    const measurementHistory = measurementHistoryRow.data || []

    const profileForPlan = {
      ...profileData,
      language: languageRow.data?.language ?? profileData?.language ?? 'en',
    }
    const prompt = buildPrompt(profileForPlan, latestMeasurement, measurementHistory)

    const message = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-opus-4-5',
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

    // Deactivate existing plans sequentially to avoid inconsistent state if one fails
    await supabase.from('workout_plans').update({ active: false }).eq('user_id', user.id)
    await supabase.from('diet_plans').update({ active: false }).eq('user_id', user.id)

    // Save workout plan
    const { data: workoutPlan, error: wpError } = await supabase.from('workout_plans').insert({
      user_id: user.id,
      plan_json: plan.workout_plan,
      active: true,
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
      return NextResponse.json({ error: `Failed to save workout plan: ${wpError.message}` }, { status: 500 })
    }

    // Save diet plan
    const { data: dietPlan, error: dpError } = await supabase.from('diet_plans').insert({
      user_id: user.id,
      plan_json: plan.diet_plan,
      active: true,
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
      return NextResponse.json({ error: `Failed to save diet plan: ${dpError.message}` }, { status: 500 })
    }

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
      { ...profileForPlan, ...profileData, body_fat_pct: latestMeasurement?.body_fat_pct },
      plan.diet_plan,
      normalizeAiLanguage(profileForPlan.language),
    ).catch(e => console.error('[generate-plan] supplement gen failed:', e))

    // Send welcome email (fire-and-forget; do not block response)
    if (user.email) {
      sendEmail({
        to: user.email,
        type: 'welcome',
        data: { name: profileData.name || 'Athlete' },
      }).catch(() => {}) // silently ignore email errors
    }

    return NextResponse.json({
      success: true,
      workout_plan_id: workoutPlan?.id,
      diet_plan_id: dietPlan?.id,
    })
  } catch (err: any) {
    console.error('Generate plan error:', err?.message || err)
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      await recordAppEvent({
        userId: user?.id,
        eventType: 'plan_generation_failed',
        severity: 'error',
        source: 'api/generate-plan',
        message: err?.message || 'Unknown generate-plan error',
      })
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

/**
 * Evidence-based macro targets using Lean Body Mass when body composition data is available.
 * LBM-based protein is more accurate — a 90kg person at 30% BF needs far less protein
 * than a 90kg person at 10% BF, despite the same total weight.
 */
function calculateMacros(p: any, latestMeasurement?: any) {
  const weight  = parseFloat(latestMeasurement?.weight_kg || p.weight_kg) || 70
  const height  = parseFloat(p.height_cm) || 170
  const age     = parseInt(p.age)         || 25
  const female  = p.gender === 'female'
  const days    = parseInt(p.training_days) || 3
  const duration = parseInt(p.session_duration) || 60
  const speed   = p.goal_speed || 'moderate'

  // ── Body composition ─────────────────────────────────────────────
  // Use measured body fat % if available; otherwise use population averages
  const measuredBf  = latestMeasurement?.body_fat_pct ? parseFloat(latestMeasurement.body_fat_pct) : null
  const defaultBf   = female ? 28 : 20
  const bodyFatPct  = measuredBf ?? defaultBf
  const leanMass    = weight * (1 - bodyFatPct / 100)
  const usingRealBf = !!measuredBf

  // ── TDEE (Mifflin-St Jeor + training-specific burn) ───────────────
  const bmr = female
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5

  // NEAT multiplier (daily life, work type)
  const workType   = (p.work_schedule || 'work').toLowerCase()
  const neatMult   = workType.includes('shift') ? 1.5 : workType === 'flexible' ? 1.45 : 1.4
  // Add weekly training kcal amortised per day (~5 kcal/min moderate training, 7 kcal/min intense)
  const weeklyTrainKcal = days * duration * (days >= 5 ? 6 : 5)
  const tdee = Math.round(bmr * neatMult + weeklyTrainKcal / 7)

  // ── Calorie target ────────────────────────────────────────────────
  // Deficit/surplus scaled to bodyweight — scientifically more appropriate than flat numbers
  const weeklyRateKg = speed === 'aggressive' ? weight * 0.01 : speed === 'slow' ? weight * 0.005 : weight * 0.007
  const deficit   = Math.min(700, Math.round(weeklyRateKg * 7700 / 7))  // 7700 kcal ≈ 1 kg fat
  const surplus   = speed === 'aggressive' ? 350 : speed === 'slow' ? 150 : 250

  const minCalories = female ? 1300 : 1500
  let calories: number
  switch (p.goal) {
    case 'lose_fat':      calories = Math.max(minCalories, tdee - deficit); break
    case 'build_muscle':  calories = tdee + surplus; break
    case 'recomposition': calories = tdee;  break
    default:              calories = Math.max(minCalories, tdee - 100)
  }

  // ── Protein (LBM-based) ───────────────────────────────────────────
  // Cutting: higher (muscle preservation) · Building: moderate · Maintenance: lower
  const protGKgLBM = p.goal === 'lose_fat' ? 2.5
    : p.goal === 'recomposition' ? 2.3
    : p.goal === 'build_muscle' ? 2.0
    : 1.8
  const protein = Math.round(leanMass * protGKgLBM)

  // ── Fat (25-30% of calories for hormonal health) ──────────────────
  const fatFromPct   = Math.round(calories * 0.27 / 9)
  const fatFromLBM   = Math.round(leanMass * 0.8)
  const fat          = Math.max(fatFromPct, fatFromLBM, 40)

  // ── Carbs (fill remaining) ────────────────────────────────────────
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4))

  // ── Water ─────────────────────────────────────────────────────────
  const water = Math.round((weight * 35 + Math.min(days, 5) * 400) / 100) / 10

  return {
    calories, protein, fat, carbs, water, tdee,
    leanMass: Math.round(leanMass),
    bodyFatPct: Math.round(bodyFatPct),
    usingRealBf,
    weeklyWeightChangeKg: Math.round(weeklyRateKg * 100) / 100,
  }
}

function buildPrompt(p: any, latestMeasurement?: any, measurementHistory?: any[]): string {
  const language = normalizeAiLanguage(p.language)
  const m = calculateMacros(p, latestMeasurement)
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

  return `You are Ion, a world-class AI personal trainer and clinical nutritionist. Build a complete, hyper-personalised 12-week fitness and nutrition plan for this specific client.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan names, meal names, recipes, exercise tips, coaching notes, summaries, and ion_message')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE CLIENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${p.name} | Age: ${p.age} | Gender: ${p.gender}
Weight: ${latestMeasurement?.weight_kg || p.weight_kg} kg | Height: ${p.height_cm} cm
Goal: ${goalLabels[p.goal] || p.goal}
Target: ${p.goal_target || 'Not specified'} | Deadline: ${p.goal_date || 'No deadline set'}
Goal speed: ${p.goal_speed || 'moderate'}

BODY COMPOSITION:
  Lean Body Mass: ${m.leanMass} kg
  Estimated body fat: ${m.bodyFatPct}% (${m.usingRealBf ? 'measured' : 'estimated — no scan yet'})

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUTRITION PROFILE — READ CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Foods LOVED (MUST appear in meals): ${p.foods_loved || 'Not specified — use common whole foods'}
Foods HATED (NEVER include): ${p.foods_hated || 'None'}
Allergies (NEVER include — safety critical): ${p.allergies || 'None'}
Dietary restrictions: ${dietPrefs.join(', ') || 'None'}
Meals per day: ${p.meals_per_day || 3}
Cooking ability: ${p.cooking_ability || 'moderate'} | Budget: ${p.food_budget || 'moderate'}
Current supplements: ${supplements.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALCULATED MACRO TARGETS
(derived from LBM + TDEE formula below — adjust ±5% if strongly justified)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TDEE: ${m.tdee} kcal/day
Goal adjustment: ${p.goal === 'lose_fat' ? `–${m.tdee - m.calories} kcal deficit (${m.weeklyWeightChangeKg} kg/week expected loss)` : p.goal === 'build_muscle' ? `+${m.calories - m.tdee} kcal surplus (lean gain)` : 'maintenance'}
→ daily_calories: ${m.calories} kcal

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIET PLAN BUILDING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PERSONALISATION — this is not a generic plan:
   - Every meal must contain at least one food from the "Foods LOVED" list
   - Zero exceptions: never include foods from "Foods HATED" or "Allergies"
   - Recipes must match cooking ability (${p.cooking_ability || 'moderate'})
   - Ingredient costs must align with budget (${p.food_budget || 'moderate'})

2. MEAL TIMING — built around the user's real day:
   - First meal ≈ 1 hour after wake (${p.wake_time || '7:00'})
   - Last meal ≥ 1.5 hours before sleep (${p.sleep_time || '23:00'})
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

IMPORTANT: Respond with ONLY valid JSON. No markdown fences, no extra text.
JSON key names must stay exactly as shown. For workout day_name, ALWAYS use English weekdays (Sunday–Saturday) even for Arabic users — only translate user-facing display strings.

{
  "summary": "3-sentence personalised overview: what the approach is, why it fits this person, what result to expect in 12 weeks",
  "workout_plan": {
    "name": "Plan name",
    "schedule": "${p.training_days} days/week",
    "split_type": "push_pull_legs / upper_lower / full_body / etc",
    "weeks": 12,
    "notes": "Key training principles personalised for this person",
    "progressive_overload": "How to progress each week",
    "rest_days": ["list", "of", "rest", "days"],
    "days": [
      {
        "day_name": "Monday",
        "muscle_focus": "Push / Upper / Full Body / etc",
        "warmup_min": 10,
        "duration_min": ${p.session_duration || 60},
        "exercises": [
          {
            "name": "Exercise Name",
            "sets": 4,
            "reps": "8-12",
            "rest_sec": 90,
            "weight_guidance": "Specific starting weight or RPE guidance based on strength_levels",
            "form_tip": "Key form cue in one sentence",
            "muscle_group": "Primary muscle"
          }
        ]
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

