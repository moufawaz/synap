/**
 * Shared plan-building calculations used by both generate-plan and renew-plan.
 * Centralised here so improvements only need to be made in one place.
 */

export type AiLanguage = 'en' | 'ar'

// ── Workout parameters ────────────────────────────────────────────────────────

export interface WorkoutParams {
  expTier:              'beginner' | 'intermediate' | 'advanced'
  setsPerMuscle:        { min: number; max: number }
  reps:                 { compounds: string; accessories: string }
  restSec:              { compounds: number; accessories: number }
  targetRPE:            number
  exercisesPerSession:  number
  splitType:            string
  progressionModel:     string
  deloadWeeks:          number[]
  intensityTechniques:  string
  volumeNote:           string
}

export function calculateWorkoutParams(p: any): WorkoutParams {
  const days      = parseInt(p.training_days) || 3
  const duration  = parseInt(p.session_duration) || 60
  const rawExp    = (p.training_experience || '').toLowerCase()
  const goal      = p.goal || 'be_healthier'
  const stress    = (p.stress_level || 'moderate').toLowerCase()
  const sleep     = (p.sleep_quality || 'average').toLowerCase()

  // ── Experience tier ───────────────────────────────────────────────
  const expTier: WorkoutParams['expTier'] = rawExp.includes('adv') ? 'advanced'
    : rawExp.includes('inter') || rawExp.includes('med') ? 'intermediate'
    : 'beginner'

  // ── Weekly sets per muscle group ──────────────────────────────────
  const setsPerMuscle = expTier === 'advanced'      ? { min: 16, max: 22 }
    : expTier === 'intermediate'                     ? { min: 12, max: 16 }
    : /* beginner */                                   { min: 10, max: 12 }

  // ── Rep ranges by goal ────────────────────────────────────────────
  const repMap: Record<string, { compounds: string; accessories: string }> = {
    hypertrophy: { compounds: '6–12', accessories: '10–15' },
    fat_loss:    { compounds: '10–15', accessories: '12–20' },
    strength:    { compounds: '3–6',  accessories: '6–10' },
    health:      { compounds: '10–15', accessories: '12–20' },
  }
  const repKey = goal === 'build_muscle' ? 'hypertrophy'
    : goal === 'lose_fat' ? 'fat_loss'
    : goal === 'recomposition' ? 'hypertrophy'
    : 'health'
  const reps = repMap[repKey]

  // ── Rest periods ──────────────────────────────────────────────────
  const restSec = {
    compounds:   goal === 'lose_fat' ? 60 : goal === 'build_muscle' ? 120 : 90,
    accessories: goal === 'lose_fat' ? 45 : goal === 'build_muscle' ? 90  : 60,
  }

  // ── RPE target (adjusted for recovery capacity) ───────────────────
  const baseRPE       = expTier === 'beginner' ? 7 : expTier === 'intermediate' ? 8 : 8.5
  const stressPenalty = stress.includes('very') || stress === 'high' ? -0.5 : 0
  const sleepPenalty  = sleep.includes('poor') ? -0.5 : 0
  const targetRPE     = Math.max(6, Math.round((baseRPE + stressPenalty + sleepPenalty) * 2) / 2)

  // ── Exercises per session ─────────────────────────────────────────
  const exercisesPerSession = duration <= 45 ? 5 : duration <= 60 ? 7 : duration <= 75 ? 8 : 10

  // ── Split recommendation ──────────────────────────────────────────
  let splitType: string
  if      (days <= 2)  splitType = 'full_body'
  else if (days === 3) splitType = goal === 'build_muscle' ? 'push_pull_legs' : 'full_body_x3'
  else if (days === 4) splitType = 'upper_lower'
  else if (days === 5) splitType = goal === 'build_muscle' ? 'push_pull_legs_x2_upper' : 'push_pull_legs_cardio'
  else                 splitType = 'push_pull_legs_x2'

  // ── Progressive overload model ────────────────────────────────────
  const progressionModel = expTier === 'beginner'
    ? 'Linear: add 2.5 kg (upper body) or 5 kg (lower body) every session once all prescribed reps are completed with good form'
    : expTier === 'intermediate'
    ? 'Double progression: hit the top of the rep range for every set → increase weight by 2.5 kg next session. If you miss reps, stay at the same weight'
    : 'Wave loading: 3-week progressive overload block (volume+intensity) → 1 deload week at 50% volume. Increase loading by ~2.5% per wave on main compound lifts'

  // ── Deload weeks ──────────────────────────────────────────────────
  const deloadWeeks = expTier === 'beginner' ? [12]
    : expTier === 'intermediate'             ? [6, 12]
    : /* advanced */                           [4, 8, 12]

  // ── Intensity techniques ──────────────────────────────────────────
  const intensityTechniques = expTier === 'advanced'
    ? 'Drop sets, rest-pause, and mechanical drop sets may be used on the last set of isolation exercises only. Do NOT apply to compound lifts.'
    : expTier === 'intermediate'
    ? 'Optional: add 1 back-off set (60% working weight × 15 reps) after main compounds for extra volume'
    : 'Focus on form and consistency — no advanced techniques needed at this stage'

  return {
    expTier,
    setsPerMuscle,
    reps,
    restSec,
    targetRPE,
    exercisesPerSession,
    splitType,
    progressionModel,
    deloadWeeks,
    intensityTechniques,
    volumeNote: `${setsPerMuscle.min}–${setsPerMuscle.max} working sets per muscle group per week`,
  }
}

// ── Macro calculation ─────────────────────────────────────────────────────────

export interface MacroTargets {
  calories:              number
  protein:               number
  fat:                   number
  carbs:                 number
  water:                 number
  tdee:                  number
  leanMass:              number
  bodyFatPct:            number
  usingRealBf:           boolean
  weeklyWeightChangeKg:  number
}

export function calculateMacros(p: any, latestMeasurement?: any): MacroTargets {
  const weight   = parseFloat(latestMeasurement?.weight_kg || p.weight_kg) || 70
  const height   = parseFloat(p.height_cm)  || 170
  const age      = parseInt(p.age)           || 25
  const female   = p.gender === 'female'
  const days     = parseInt(p.training_days) || 3
  const duration = parseInt(p.session_duration) || 60
  const speed    = p.goal_speed || 'moderate'

  // ── Body composition ─────────────────────────────────────────────
  // Priority: 1) latest measurement BF%  2) profile InBody scan BF%  3) population default
  const measuredBf  = latestMeasurement?.body_fat_pct ? parseFloat(latestMeasurement.body_fat_pct) : null
  const inbodyBf    = (!measuredBf && p.body_fat_pct) ? parseFloat(p.body_fat_pct) : null
  const defaultBf   = female ? 28 : 20
  const bodyFatPct  = measuredBf ?? inbodyBf ?? defaultBf
  const leanMass    = weight * (1 - bodyFatPct / 100)
  const usingRealBf = !!(measuredBf ?? inbodyBf)

  // ── BMR ────────────────────────────────────────────────────────────
  // Mifflin-St Jeor only knows weight/height/age/sex — it's blind to body
  // composition. An InBody scan reports a lean-mass-based BMR that is more
  // accurate for muscular / lean / higher-bodyfat people. Prefer the measured
  // BMR when a scan provides one, but ONLY if it lands within ±25% of the
  // formula value — that rejects a bad or stale scan (e.g. big weight change
  // since the scan) so it can't distort the calorie target. Otherwise Mifflin.
  const formulaBmr = female
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5
  const inbodyBmr      = p.bmr_kcal != null ? parseFloat(p.bmr_kcal) : NaN
  const usingInbodyBmr = Number.isFinite(inbodyBmr)
    && inbodyBmr >= formulaBmr * 0.75
    && inbodyBmr <= formulaBmr * 1.25
  const bmr = usingInbodyBmr ? inbodyBmr : formulaBmr

  const workType        = (p.work_schedule || 'work').toLowerCase()
  const neatMult        = workType.includes('shift') ? 1.5 : workType === 'flexible' ? 1.45 : 1.4
  const weeklyTrainKcal = days * duration * (days >= 5 ? 6 : 5)
  const tdee            = Math.round(bmr * neatMult + weeklyTrainKcal / 7)

  // ── Calorie target ────────────────────────────────────────────────
  const weeklyRateKg = speed === 'aggressive' ? weight * 0.01 : speed === 'slow' ? weight * 0.005 : weight * 0.007
  const deficit      = Math.min(700, Math.round(weeklyRateKg * 7700 / 7))
  const surplus      = speed === 'aggressive' ? 350 : speed === 'slow' ? 150 : 250
  const minCalories  = female ? 1300 : 1500

  let calories: number
  switch (p.goal) {
    case 'lose_fat':      calories = Math.max(minCalories, tdee - deficit); break
    case 'build_muscle':  calories = tdee + surplus; break
    case 'recomposition': calories = tdee; break
    default:              calories = Math.max(minCalories, tdee - 100)
  }

  // ── Protein (LBM-based) ───────────────────────────────────────────
  const protGKgLBM = p.goal === 'lose_fat'       ? 2.5
    : p.goal === 'recomposition'                  ? 2.3
    : p.goal === 'build_muscle'                   ? 2.0
    : 1.8
  const protein = Math.round(leanMass * protGKgLBM)

  // ── Fat (27% of calories for hormonal health) ─────────────────────
  const fatFromPct = Math.round(calories * 0.27 / 9)
  const fatFromLBM = Math.round(leanMass * 0.8)
  const fat        = Math.max(fatFromPct, fatFromLBM, 40)

  // ── Carbs (fill remaining) ────────────────────────────────────────
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4))

  // ── Water ─────────────────────────────────────────────────────────
  const water = Math.round((weight * 35 + Math.min(days, 5) * 400) / 100) / 10

  return {
    calories, protein, fat, carbs, water, tdee,
    leanMass:             Math.round(leanMass),
    bodyFatPct:           Math.round(bodyFatPct),
    usingRealBf,
    weeklyWeightChangeKg: Math.round(weeklyRateKg * 100) / 100,
  }
}

// ── Equipment string builder (reused in both prompts) ────────────────────────
export function equipmentString(p: any): string {
  if (Array.isArray(p.equipment) && p.equipment.length > 0) return p.equipment.join(' | ')
  if (p.gym_access) return 'Full gym (barbells, dumbbells, cables, machines)'
  return 'Bodyweight only'
}

// ── Machine-intelligence rule (reused in both prompts) ───────────────────────
export function machineIntelligenceRule(p: any, w: WorkoutParams): string {
  return `
   For EVERY exercise, pick the BEST variant (barbell, dumbbell, machine, or cable) based on what produces the best outcome for this person's goal and experience:
   - Compound movements (squat, hinge, press, row): use BARBELL or DUMBBELL variants — greater muscle activation and hormonal stimulus
   - Isolation and accessory work: MACHINES and CABLES are often SUPERIOR — constant tension, safer joint loading, better mind-muscle connection (e.g. Cable Fly > Dumbbell Fly; Leg Extension Machine for quads; Seated Cable Row for lats)
   - When both options are equally effective, prefer machines for safety and consistency
   - ALWAYS write the SPECIFIC variant name: "Lat Pulldown Machine", "Seated Leg Curl Machine", "Cable Tricep Pushdown (Rope)", "Chest Press Machine", "Leg Press Machine", "Seated Cable Row"
   - Balance push/pull volume — equal sets of horizontal push + horizontal pull per week`.trim()
}
