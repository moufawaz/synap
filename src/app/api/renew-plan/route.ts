import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { sendEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/onesignal'
import { resolveExerciseVideo } from '@/lib/youtube-search'
import { getUserSubscription, effectivePlan } from '@/lib/subscription'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction, normalizeAiLanguage } from '@/lib/ai-language'
import { withAnthropicRetry } from '@/lib/anthropic'
import { generateSupplementRecsIfElite } from '@/lib/supplement-gen'
import { calculateMacros, calculateWorkoutParams, equipmentString, machineIntelligenceRule } from '@/lib/plan-builder'
import { normalizeWorkoutPlanDays } from '@/lib/workout-days'

// POST /api/renew-plan  — called when a user's plan cycle expires
export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = await createServerClient()
    const admin    = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planType }: { planType: 'diet' | 'workout' } = await req.json()
    if (!planType) return NextResponse.json({ error: 'Missing planType' }, { status: 400 })

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
    const progressBlock = measurementHistory.length >= 2
      ? measurementHistory
          .map(m => `${m.date}: ${m.weight_kg}kg${m.body_fat_pct ? ` / ${m.body_fat_pct}%BF` : ''}${m.waist_cm ? ` / waist ${m.waist_cm}cm` : ''}`)
          .join('\n')
      : measurementHistory.length === 1
        ? `${measurementHistory[0].date}: ${measurementHistory[0].weight_kg}kg (only 1 measurement — use as baseline)`
        : 'No measurements recorded — keep macros at baseline targets'

    // ── Macro targets (same formula as initial generation) ────────────
    const m = calculateMacros(profile, latestMeasurement)
    const w = calculateWorkoutParams(profile)

    const dietPrefs   = Array.isArray(profile.dietary_preference) ? profile.dietary_preference : (profile.dietary_preference || '').split(',').filter(Boolean)
    const supplements = Array.isArray(profile.supplements) ? profile.supplements : (profile.supplements || '').split(',').filter(Boolean)

    // ── Build prompt ───────────────────────────────────────────────────
    const prompt = planType === 'diet'
      ? buildDietRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, dietPrefs, supplements, latestMeasurement })
      : buildWorkoutRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan })

    // ── Call Claude ────────────────────────────────────────────────────
    const message = await withAnthropicRetry(() => client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 16000,
      system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
      messages: [{ role: 'user', content: prompt }],
    }))

    await recordAiUsage({ userId: user.id, feature: `renew_plan_${planType}`, model: message.model, usage: message.usage })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse renewed plan' }, { status: 500 })
    let planJson = JSON.parse(match[0])

    // ── Post-process ───────────────────────────────────────────────────
    if (planType === 'workout') {
      planJson = normalizeWorkoutPlanDays(planJson)
      // Enrich exercises with YouTube video IDs
      const allExercises: any[] = (planJson.days || []).flatMap((day: any) => day.exercises || [])
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

    // ── Save ───────────────────────────────────────────────────────────
    const table        = planType === 'diet' ? 'diet_plans' : 'workout_plans'
    const durationWeeks = planType === 'diet' ? 4 : 6
    const startDate    = new Date().toISOString().split('T')[0]
    const endDate      = new Date(Date.now() + durationWeeks * 7 * 86400000).toISOString().split('T')[0]

    await supabase.from(table).update({ active: false }).eq('user_id', user.id).eq('active', true)
    await supabase.from(table).insert({ user_id: user.id, plan_json: planJson, active: true, start_date: startDate, end_date: endDate })

    // ── Chat message ───────────────────────────────────────────────────
    const ionMessage = language === 'ar'
      ? (planType === 'diet'
        ? `خطة التغذية الجديدة جاهزة يا ${profile.name}. عدّلت السعرات والماكروز بناءً على تقدمك الفعلي في القياسات الأخيرة.`
        : `برنامج التمرين الجديد جاهز يا ${profile.name}. رفعت الحجم والشدة بناءً على مستواك الحالي.`)
      : (planType === 'diet'
        ? `Your renewed diet plan is live, ${profile.name}. I've updated calories and macros based on your actual measurement progress.`
        : `New workout programme unlocked, ${profile.name}. I've increased the volume and intensity based on where you are now.`)

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'ion',
      content: ionMessage,
      message_type: 'new_plan',
    })

    // ── Notifications (fire-and-forget) ────────────────────────────────
    await Promise.allSettled([
      sendEmail({ to: user.email!, type: 'new_plan', data: { name: profile.name, planType, weeks: durationWeeks } }),
      sendPushNotification({ userId: user.id, type: 'plan_renewal' }),
    ])

    // ── Supplement recs for Elite (non-blocking) ───────────────────────
    const dietPlanForSupp = planType === 'diet' ? planJson : null
    generateSupplementRecsIfElite(
      supabase, client, user.id,
      { ...profile, body_fat_pct: latestMeasurement?.body_fat_pct },
      dietPlanForSupp,
      language,
    ).catch(e => console.error('[renew-plan] supplement gen failed:', e))

    return NextResponse.json({ ok: true, plan: planJson })
  } catch (err: any) {
    console.error('[renew-plan]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Diet renewal prompt ───────────────────────────────────────────────────────

function buildDietRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan, dietPrefs, supplements, latestMeasurement }: any) {
  const ar = language === 'ar'
  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Body Fat', build_muscle: 'Build Muscle & Strength',
    recomposition: 'Body Recomposition', improve_fitness: 'Improve General Fitness', be_healthier: 'Be Healthier',
  }
  const prevMacroSummary = oldPlan
    ? `Previous plan: ${oldPlan.daily_calories ?? '?'} kcal | ${oldPlan.protein_g ?? '?'}g protein | ${oldPlan.carbs_g ?? '?'}g carbs | ${oldPlan.fat_g ?? '?'}g fat`
    : 'No previous diet plan on record'

  return `You are Ion, a world-class AI nutritionist. Generate a RENEWED 4-week diet plan for this client based on their real progress.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan name, meal names, recipes, tips, and coaching notes')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Weight: ${latestMeasurement?.weight_kg || profile.weight_kg} kg | Height: ${profile.height_cm} cm
Goal: ${goalLabels[profile.goal] || profile.goal}
Goal speed: ${profile.goal_speed || 'moderate'}
LBM: ${m.leanMass} kg | Body fat: ${m.bodyFatPct}% (${m.usingRealBf ? 'measured' : 'estimated'})
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

function buildWorkoutRenewalPrompt({ profile, language, m, w, progressBlock, oldPlan }: any) {
  const ar = language === 'ar'
  const prevSplit = oldPlan?.split_type || 'unknown'
  const prevDays  = Array.isArray(oldPlan?.days) ? oldPlan.days.length : '?'

  return `You are Ion, a world-class AI personal trainer. Generate a RENEWED 6-week progressive workout programme for this client. This is their next training cycle — build on where they left off.

${aiLanguageInstruction(language, 'all user-facing JSON string values including plan name, session goals, exercise form tips, progression notes, and coaching notes')}

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${progressBlock}

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
