/**
 * Seed plan for a specific user by email.
 * Usage: node scripts/seed-plan.mjs
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const TARGET_EMAIL = 'mohamedhossam03@gmail.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeAiLanguage(v) { return v === 'ar' ? 'ar' : 'en' }

function aiLanguageInstruction(language, scope = 'all user-facing text') {
  if (language === 'ar') {
    return `LANGUAGE REQUIREMENT: Write ${scope} fully in Arabic. Keep JSON keys, enum values, IDs, dates, numbers, URLs, video IDs, and database identifiers unchanged. Do not mix English except for proper nouns, brand names, product names, exercise names that are commonly known in English, or user-provided text that should remain literal.`
  }
  return `LANGUAGE REQUIREMENT: Write ${scope} in English. Keep JSON keys, enum values, IDs, dates, numbers, URLs, video IDs, and database identifiers unchanged.`
}

function normalizeWorkoutPlanDays(plan) {
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const normalizeDay = (day) => {
    if (!day || typeof day !== 'object') return day
    const raw = String(day.day_name ?? day.day ?? day.name ?? '').trim()
    const canonical = DAY_NAMES.find(d => d.toLowerCase() === raw.toLowerCase()) ?? raw
    if (canonical) { day.day_name = canonical; if ('day' in day) day.day = canonical }
    return day
  }
  if (Array.isArray(plan?.days)) plan.days = plan.days.map(normalizeDay)
  if (Array.isArray(plan?.weeks)) plan.weeks = plan.weeks.map(w => ({ ...w, days: Array.isArray(w?.days) ? w.days.map(normalizeDay) : w?.days }))
  if ((!Array.isArray(plan?.days) || plan.days.length === 0) && Array.isArray(plan?.weeks)) {
    const first = plan.weeks.find(w => Array.isArray(w?.days) && w.days.length > 0)
    if (first) plan.days = first.days.map(normalizeDay)
  }
  return plan
}

function extractJSON(raw) {
  const stripped = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const start = stripped.indexOf('{')
  if (start !== -1) {
    let depth = 0, inString = false, escaped = false
    for (let i = start; i < stripped.length; i++) {
      const ch = stripped[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(stripped.slice(start, i+1)) } catch {} break } }
    }
  }
  return null
}

// ── calculateWorkoutParams ───────────────────────────────────────────────────

function calculateWorkoutParams(p) {
  const days     = parseInt(p.training_days) || 3
  const duration = parseInt(p.session_duration) || 60
  const rawExp   = (p.training_experience || '').toLowerCase()
  const goal     = p.goal || 'be_healthier'
  const stress   = (p.stress_level || 'moderate').toLowerCase()
  const sleep    = (p.sleep_quality || 'average').toLowerCase()

  const expTier = rawExp.includes('adv') ? 'advanced' : rawExp.includes('inter') || rawExp.includes('med') ? 'intermediate' : 'beginner'

  const setsPerMuscle = expTier === 'advanced' ? { min: 16, max: 22 }
    : expTier === 'intermediate' ? { min: 12, max: 16 }
    : { min: 10, max: 12 }

  const repMap = {
    hypertrophy: { compounds: '6–12', accessories: '10–15' },
    fat_loss:    { compounds: '10–15', accessories: '12–20' },
    strength:    { compounds: '3–6', accessories: '6–10' },
    health:      { compounds: '10–15', accessories: '12–20' },
  }
  const repKey = goal === 'build_muscle' ? 'hypertrophy' : goal === 'lose_fat' ? 'fat_loss' : goal === 'recomposition' ? 'hypertrophy' : 'health'
  const reps = repMap[repKey]

  const restSec = {
    compounds:   goal === 'lose_fat' ? 60 : goal === 'build_muscle' ? 120 : 90,
    accessories: goal === 'lose_fat' ? 45 : goal === 'build_muscle' ? 90  : 60,
  }

  const baseRPE       = expTier === 'beginner' ? 7 : expTier === 'intermediate' ? 8 : 8.5
  const stressPenalty = stress.includes('very') || stress === 'high' ? -0.5 : 0
  const sleepPenalty  = sleep.includes('poor') ? -0.5 : 0
  const targetRPE     = Math.max(6, Math.round((baseRPE + stressPenalty + sleepPenalty) * 2) / 2)

  const exercisesPerSession = duration <= 45 ? 5 : duration <= 60 ? 7 : duration <= 75 ? 8 : 10

  let splitType
  if      (days <= 2)  splitType = 'full_body'
  else if (days === 3) splitType = goal === 'build_muscle' ? 'push_pull_legs' : 'full_body_x3'
  else if (days === 4) splitType = 'upper_lower'
  else if (days === 5) splitType = goal === 'build_muscle' ? 'push_pull_legs_x2_upper' : 'push_pull_legs_cardio'
  else                 splitType = 'push_pull_legs_x2'

  const progressionModel = expTier === 'beginner'
    ? 'Linear: add 2.5 kg (upper body) or 5 kg (lower body) every session once all prescribed reps are completed with good form'
    : expTier === 'intermediate'
    ? 'Double progression: hit the top of the rep range for every set → increase weight by 2.5 kg next session. If you miss reps, stay at the same weight'
    : 'Wave loading: 3-week progressive overload block → 1 deload week at 50% volume. Increase loading by ~2.5% per wave on main compound lifts'

  const deloadWeeks = expTier === 'beginner' ? [12] : expTier === 'intermediate' ? [6, 12] : [4, 8, 12]

  const intensityTechniques = expTier === 'advanced'
    ? 'Drop sets, rest-pause, and mechanical drop sets may be used on the last set of isolation exercises only. Do NOT apply to compound lifts.'
    : expTier === 'intermediate'
    ? 'Optional: add 1 back-off set (60% working weight × 15 reps) after main compounds for extra volume'
    : 'Focus on form and consistency — no advanced techniques needed at this stage'

  return { expTier, setsPerMuscle, reps, restSec, targetRPE, exercisesPerSession, splitType, progressionModel, deloadWeeks, intensityTechniques, volumeNote: `${setsPerMuscle.min}–${setsPerMuscle.max} working sets per muscle group per week` }
}

// ── calculateMacros ──────────────────────────────────────────────────────────

function calculateMacros(p, latestMeasurement) {
  const weight  = parseFloat(latestMeasurement?.weight_kg || p.weight_kg) || 70
  const height  = parseFloat(p.height_cm) || 170
  const age     = parseInt(p.age) || 25
  const female  = p.gender === 'female'
  const days    = parseInt(p.training_days) || 3
  const duration = parseInt(p.session_duration) || 60
  const speed   = p.goal_speed || 'moderate'

  const measuredBf = latestMeasurement?.body_fat_pct ? parseFloat(latestMeasurement.body_fat_pct) : null
  const defaultBf  = female ? 28 : 20
  const bodyFatPct = measuredBf ?? defaultBf
  const leanMass   = weight * (1 - bodyFatPct / 100)
  const usingRealBf = !!measuredBf

  const bmr = female
    ? 10*weight + 6.25*height - 5*age - 161
    : 10*weight + 6.25*height - 5*age + 5

  const workType = (p.work_schedule || 'work').toLowerCase()
  const neatMult = workType.includes('shift') ? 1.5 : workType === 'flexible' ? 1.45 : 1.4
  const weeklyTrainKcal = days * duration * (days >= 5 ? 6 : 5)
  const tdee = Math.round(bmr * neatMult + weeklyTrainKcal / 7)

  const weeklyRateKg = speed === 'aggressive' ? weight*0.01 : speed === 'slow' ? weight*0.005 : weight*0.007
  const deficit  = Math.min(700, Math.round(weeklyRateKg * 7700 / 7))
  const surplus  = speed === 'aggressive' ? 350 : speed === 'slow' ? 150 : 250
  const minCalories = female ? 1300 : 1500

  let calories
  switch (p.goal) {
    case 'lose_fat':      calories = Math.max(minCalories, tdee - deficit); break
    case 'build_muscle':  calories = tdee + surplus; break
    case 'recomposition': calories = tdee; break
    default:              calories = Math.max(minCalories, tdee - 100)
  }

  const protGKgLBM = p.goal === 'lose_fat' ? 2.5 : p.goal === 'recomposition' ? 2.3 : p.goal === 'build_muscle' ? 2.0 : 1.8
  const protein = Math.round(leanMass * protGKgLBM)
  const fatFromPct = Math.round(calories * 0.27 / 9)
  const fatFromLBM = Math.round(leanMass * 0.8)
  const fat = Math.max(fatFromPct, fatFromLBM, 40)
  const carbs = Math.max(50, Math.round((calories - protein*4 - fat*9) / 4))
  const water = Math.round((weight*35 + Math.min(days,5)*400) / 100) / 10

  return { calories, protein, fat, carbs, water, tdee, leanMass: Math.round(leanMass), bodyFatPct: Math.round(bodyFatPct), usingRealBf, weeklyWeightChangeKg: Math.round(weeklyRateKg*100)/100 }
}

// ── buildPrompt ──────────────────────────────────────────────────────────────

function buildPrompt(p, latestMeasurement, measurementHistory) {
  const language = normalizeAiLanguage(p.language)
  const m = calculateMacros(p, latestMeasurement)
  const w = calculateWorkoutParams(p)

  const goalLabels = { lose_fat:'Lose Body Fat', build_muscle:'Build Muscle & Strength', recomposition:'Body Recomposition', improve_fitness:'Improve General Fitness', be_healthier:'Improve Overall Health' }

  const measureBlock = (measurementHistory && measurementHistory.length > 0)
    ? measurementHistory.map(h => `  ${h.date}: ${h.weight_kg}kg${h.body_fat_pct ? ` / ${h.body_fat_pct}% BF` : ''}${h.waist_cm ? ` / waist ${h.waist_cm}cm` : ''}`).join('\n')
    : '  No measurement history — this is the user\'s first plan.'

  const dietPrefs = Array.isArray(p.dietary_preference) ? p.dietary_preference : (p.dietary_preference||'').split(',').filter(Boolean)
  const supplements = Array.isArray(p.supplements) ? p.supplements : (p.supplements||'').split(',').filter(Boolean)

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
(adjust ±5% if strongly justified)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TDEE: ${m.tdee} kcal/day
Goal adjustment: ${p.goal === 'lose_fat' ? `–${m.tdee - m.calories} kcal deficit (${m.weeklyWeightChangeKg} kg/week expected loss)` : p.goal === 'build_muscle' ? `+${m.calories - m.tdee} kcal surplus` : 'maintenance'}
→ daily_calories: ${m.calories} kcal
Protein: ${m.protein} g  (${(m.protein / m.leanMass).toFixed(1)} g/kg LBM)
Fat:     ${m.fat} g  (27% of calories)
Carbs:   ${m.carbs} g
Water:   ${m.water} L/day

METHODOLOGY:
- BMR = Mifflin-St Jeor using ${latestMeasurement?.weight_kg || p.weight_kg} kg
- Protein set at ${(m.protein / m.leanMass).toFixed(1)} g/kg LBM (lean mass = ${m.leanMass} kg)
- Meal totals MUST sum to ±40 kcal of daily_calories target

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIET PLAN BUILDING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PERSONALISATION — every meal must contain at least one food from "Foods LOVED". Zero exceptions on hated foods or allergies.
2. MEAL TIMING — First meal ~1h after wake. Last meal ≥1.5h before sleep. Pre-workout: 60–90 min before, carb-focused. Post-workout: within 45 min, high protein+carbs.
3. MACRO DISTRIBUTION — higher carbs around training, lower in evening.
4. MICRONUTRIENTS — min 2 different veg per day. Include omega-3 sources unless allergic.
5. RECIPE QUALITY — exact gram amounts, practical steps, batch prep tip.
6. GOAL FOCUS: ${p.goal === 'lose_fat' ? 'Calorie accuracy critical. High-volume low-calorie foods for satiety.' : p.goal === 'build_muscle' ? 'Post-workout meal is priority. Protein minimum 25g per meal. Calorie-dense surplus foods.' : p.goal === 'recomposition' ? 'Calorie cycling: higher on training days. Carbs mostly around training.' : 'Balanced variety. Whole foods priority.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKOUT PLAN BUILDING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALCULATED WORKOUT PARAMETERS:
  Experience tier:        ${w.expTier}
  Recommended split:      ${w.splitType}
  Volume target:          ${w.volumeNote}
  Rep range — compounds:  ${w.reps.compounds} reps
  Rep range — accessories: ${w.reps.accessories} reps
  Rest — compounds:       ${w.restSec.compounds}s | Rest — accessories: ${w.restSec.accessories}s
  Target RPE:             ${w.targetRPE}/10
  Exercises per session:  ~${w.exercisesPerSession}
  Deload weeks:           Weeks ${w.deloadWeeks.join(', ')}

1. SPLIT: Use ${w.splitType} split — optimal for ${p.training_days} days/week at ${w.expTier} level.

2. EXERCISE SELECTION & EQUIPMENT INTELLIGENCE:
   Available equipment: ${Array.isArray(p.equipment) ? p.equipment.join(' | ') : 'Full gym'}
   NEVER include: ${p.exercises_hated || 'none'}. Design around injuries: ${p.injuries || 'none'}.

   For EVERY exercise, choose the BEST variant (free weight, machine, or cable) based on what produces the best result for THIS person's goal and experience:
   - Compound movements (squat, hinge, press, row): use BARBELL or DUMBBELL variants when the user can execute with good form — these produce greater overall muscle activation and hormonal response
   - Isolation/accessory work: MACHINES and CABLES are often SUPERIOR — they provide constant tension throughout the range of motion, safer joint loading, and better mind-muscle connection (e.g., Cable Fly beats Dumbbell Fly for chest isolation, Leg Extension Machine beats nothing for quad isolation)
   - When BOTH options are equally effective, choose the machine for safety and consistency of load
   - ALWAYS use the specific name: write "Leg Press Machine", "Lat Pulldown Machine", "Seated Cable Row", "Cable Tricep Pushdown", "Chest Press Machine", "Seated Leg Curl Machine" — NOT generic names like "leg press" or "row"
   - For each exercise include WHY you chose this variant over the alternative in the form_tip or progression_note

3. LOAD: weight_guidance must be RPE-based (RPE ${w.targetRPE}) since no prior strength data is available. Be concrete — give a starting kg range AND an RPE qualifier (e.g., "40–50 kg — should feel RPE ${w.targetRPE}, ${10-w.targetRPE} reps left in tank").

4. PROGRESSION: ${w.progressionModel}
5. DELOAD: Weeks ${w.deloadWeeks.join(', ')} → 50% volume, same intensity.
6. INTENSITY TECHNIQUES: ${w.intensityTechniques}
7. GOAL FOCUS: ${p.goal === 'lose_fat' ? 'Compound movements for metabolic effect. Higher rep ranges (10-15) burn more calories. Include a 5-min metabolic finisher at end of each session (e.g., 3 rounds: 15 goblet squats + 15 cable rows). Rest 60s between sets to keep heart rate elevated.' : p.goal === 'build_muscle' ? 'Hypertrophy rep ranges with strict form. Mind-muscle connection cues. Full rest between sets.' : p.goal === 'recomposition' ? 'Resistance training priority. Moderate reps (8-15). Track strength numbers to confirm muscle retention.' : 'Balance resistance, mobility, and conditioning. Movement quality over load.'}

IMPORTANT: Respond with ONLY valid JSON. No markdown fences, no extra text.
JSON key names must stay exactly as shown. workout day_name ALWAYS uses English weekdays (Sunday–Saturday).

{
  "summary": "3-sentence personalised overview",
  "workout_plan": {
    "name": "Plan name",
    "schedule": "${p.training_days} days/week",
    "split_type": "${w.splitType}",
    "experience_tier": "${w.expTier}",
    "weeks": 12,
    "notes": "Why this split fits this person",
    "progressive_overload": "${w.progressionModel}",
    "deload_weeks": [${w.deloadWeeks.join(', ')}],
    "deload_protocol": "On deload weeks: reduce sets by 50%, keep same weight",
    "rest_days": ["list of rest days"],
    "days": [
      {
        "day_name": "Monday",
        "muscle_focus": "Push / Upper / etc",
        "session_goal": "What this day optimises for",
        "warmup_min": 10,
        "warmup_exercises": ["Hip circles 2x10", "Band pull-aparts 2x15"],
        "duration_min": ${p.session_duration || 60},
        "exercises": [
          {
            "name": "Barbell Back Squat",
            "category": "compound",
            "sets": 4,
            "reps": "${w.reps.compounds}",
            "rest_sec": ${w.restSec.compounds},
            "weight_guidance": "Specific RPE or kg guidance",
            "form_tip": "Single most important cue",
            "muscle_group": "Quadriceps",
            "progression_note": "How to progress this lift"
          }
        ],
        "cooldown_min": 5,
        "session_notes": "Recovery or technique note"
      }
    ]
  },
  "diet_plan": {
    "daily_calories": ${m.calories},
    "protein_g": ${m.protein},
    "carbs_g": ${m.carbs},
    "fat_g": ${m.fat},
    "water_l": ${m.water},
    "approach": "Specific caloric strategy for this goal",
    "calorie_methodology": "How the ${m.calories} kcal was derived",
    "pre_workout": "Exact pre-workout meal timing and composition",
    "post_workout": "Exact post-workout meal timing and composition",
    "meals": [
      {
        "name": "Meal name",
        "time": "Time based on schedule",
        "calories": 600,
        "protein_g": 40,
        "carbs_g": 70,
        "fat_g": 15,
        "description": "Why this meal works for this person",
        "recipe": {
          "title": "Recipe name",
          "prep_time_min": 5,
          "cook_time_min": 15,
          "ingredients": ["150g boneless chicken breast", "80g basmati rice (dry)"],
          "steps": ["Step 1", "Step 2"],
          "tips": "Meal-prep tip"
        },
        "foods": [
          {
            "item": "Food name",
            "amount": "Exact weight/portion",
            "calories": 300,
            "protein_g": 10,
            "carbs_g": 55,
            "fat_g": 5
          }
        ]
      }
    ]
  },
  "ion_message": "Warm, direct, personalised 3-4 sentence message from Ion. Reference name, specific goal, one food preference, and expected outcome."
}`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Looking up user: ${TARGET_EMAIL}`)

  // 1. Find user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw new Error(`Auth list failed: ${listErr.message}`)
  const authUser = users.find(u => u.email === TARGET_EMAIL)
  if (!authUser) throw new Error(`No auth user found with email ${TARGET_EMAIL}`)
  const userId = authUser.id
  console.log(`✅ Found user: ${userId}`)

  // 2. Fetch profile + language + measurements in parallel
  const [profileRes, langRes, latestMeasRes, historyRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('users').select('language').eq('id', userId).maybeSingle(),
    supabase.from('measurements').select('weight_kg, body_fat_pct, date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('measurements').select('date, weight_kg, body_fat_pct, waist_cm').eq('user_id', userId).order('date', { ascending: false }).limit(5),
  ])

  if (profileRes.error) throw new Error(`Profile fetch failed: ${profileRes.error.message}`)
  if (!profileRes.data) throw new Error(`No profile found for user ${userId}`)

  const profile = { ...profileRes.data, language: langRes.data?.language ?? profileRes.data.language ?? 'en' }
  const latestMeasurement = latestMeasRes.data
  const measurementHistory = historyRes.data || []

  console.log(`\n📋 Profile loaded:`)
  console.log(`   Name: ${profile.name}`)
  console.log(`   Goal: ${profile.goal}`)
  console.log(`   Weight: ${latestMeasurement?.weight_kg || profile.weight_kg} kg`)
  console.log(`   Training days: ${profile.training_days}/week`)
  console.log(`   Language: ${profile.language}`)
  if (latestMeasurement) {
    console.log(`   Latest measurement: ${latestMeasurement.date} — ${latestMeasurement.weight_kg}kg${latestMeasurement.body_fat_pct ? ` / ${latestMeasurement.body_fat_pct}% BF` : ''}`)
  }

  // 3. Build prompt and call Claude
  const prompt = buildPrompt(profile, latestMeasurement, measurementHistory)
  console.log(`\n🤖 Generating plan with claude-opus-4-5... (this takes ~30–60s)`)

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 16000,
    system: 'You are Ion, a world-class AI personal trainer and nutritionist. You ALWAYS respond with valid, complete JSON only: no markdown, no explanation, no text before or after the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  })

  console.log(`   ✅ Response received | stop_reason: ${msg.stop_reason} | tokens: ${JSON.stringify(msg.usage)}`)

  const rawContent = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const plan = extractJSON(rawContent)
  if (!plan) throw new Error('Claude returned invalid JSON — cannot save plan')

  if (plan.workout_plan) plan.workout_plan = normalizeWorkoutPlanDays(plan.workout_plan)

  console.log(`\n💾 Saving plans to Supabase...`)

  // 4. Deactivate existing plans
  await supabase.from('workout_plans').update({ active: false }).eq('user_id', userId)
  await supabase.from('diet_plans').update({ active: false }).eq('user_id', userId)

  // 5. Save workout plan
  const { data: wp, error: wpErr } = await supabase.from('workout_plans').insert({
    user_id: userId,
    plan_json: plan.workout_plan,
    active: true,
  }).select().maybeSingle()
  if (wpErr) throw new Error(`Workout plan save failed: ${wpErr.message}`)
  console.log(`   ✅ Workout plan saved (id: ${wp.id})`)

  // 6. Save diet plan
  const { data: dp, error: dpErr } = await supabase.from('diet_plans').insert({
    user_id: userId,
    plan_json: plan.diet_plan,
    active: true,
  }).select().maybeSingle()
  if (dpErr) throw new Error(`Diet plan save failed: ${dpErr.message}`)
  console.log(`   ✅ Diet plan saved (id: ${dp.id})`)

  // 7. Save Ion's welcome message
  if (plan.ion_message) {
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      content: plan.ion_message,
      message_type: 'text',
      metadata: { source: 'admin_seed', model: msg.model },
    })
    console.log(`   ✅ Ion welcome message saved`)
  }

  // 8. Print summary
  const macros = plan.diet_plan
  console.log(`\n🎉 Plan generated successfully!`)
  console.log(`   Workout: ${plan.workout_plan?.name || 'unnamed'} | split: ${plan.workout_plan?.split_type || '?'} | days: ${plan.workout_plan?.days?.length || '?'}`)
  console.log(`   Nutrition: ${macros?.daily_calories} kcal | ${macros?.protein_g}g protein | ${macros?.carbs_g}g carbs | ${macros?.fat_g}g fat`)
  console.log(`   Summary: ${plan.summary?.slice(0, 120)}...`)
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1) })
