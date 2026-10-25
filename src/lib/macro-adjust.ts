// Shared math for the weekly macro auto-adjustment (user route + Monday cron).

type MealRow = { date?: string | null; calories_estimated?: number | null; protein_g?: number | null }

export type MacroTargets = { calories: number; protein: number; carbs: number; fat: number }

export type MacroAdjustment = {
  adjusted_calories: number
  adjusted_protein_g: number
  adjusted_carbs_g: number
  adjusted_fat_g: number
  rationale: string
}

/**
 * Average DAILY intake over the days that have at least one logged meal.
 * Dividing by the number of meal rows (the old behaviour) reported roughly a
 * third of real intake (~600 vs ~2400 kcal) and made the AI cut targets.
 */
export function dailyIntakeAverages(meals: MealRow[]) {
  const byDay = new Map<string, { calories: number; protein: number }>()
  for (const meal of meals) {
    const day = String(meal.date || '').slice(0, 10)
    if (!day) continue
    const totals = byDay.get(day) ?? { calories: 0, protein: 0 }
    totals.calories += Number(meal.calories_estimated) || 0
    totals.protein += Number(meal.protein_g) || 0
    byDay.set(day, totals)
  }
  const days = byDay.size
  if (!days) return { calories: 0, protein: 0, daysLogged: 0 }
  let calories = 0
  let protein = 0
  for (const totals of byDay.values()) {
    calories += totals.calories
    protein += totals.protein
  }
  return { calories: Math.round(calories / days), protein: Math.round(protein / days), daysLogged: days }
}

const MAX_KCAL_CHANGE = 200
const MAX_MACRO_CHANGE_G = 25

function clampAround(value: unknown, target: number, maxChange: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return target
  if (target <= 0) return Math.round(n)
  return Math.round(Math.min(target + maxChange, Math.max(target - maxChange, n)))
}

/**
 * Validate the model's JSON before it is written into the user's plan: missing
 * or non-numeric fields keep the current target (instead of writing undefined
 * and wiping daily_calories), and changes are capped to small weekly steps.
 */
export function sanitizeAdjustment(raw: any, targets: MacroTargets): MacroAdjustment | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    adjusted_calories: clampAround(raw.adjusted_calories, targets.calories, MAX_KCAL_CHANGE),
    adjusted_protein_g: clampAround(raw.adjusted_protein_g, targets.protein, MAX_MACRO_CHANGE_G),
    adjusted_carbs_g: clampAround(raw.adjusted_carbs_g, targets.carbs, MAX_MACRO_CHANGE_G),
    adjusted_fat_g: clampAround(raw.adjusted_fat_g, targets.fat, MAX_MACRO_CHANGE_G),
    rationale: typeof raw.rationale === 'string' ? raw.rationale : '',
  }
}
