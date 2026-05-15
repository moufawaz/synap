import Anthropic from '@anthropic-ai/sdk'
import { getUserSubscription, effectivePlan, isLaunchMode } from '@/lib/subscription'
import { recordAiUsage } from '@/lib/ai-usage'
import { aiLanguageInstruction } from '@/lib/ai-language'

/**
 * Generate supplement + vitamin recommendations for an Elite user.
 * Fire-and-forget: caller should .catch() errors.
 *
 * @param supabase  - Server or admin Supabase client
 * @param client    - Anthropic client
 * @param userId    - User UUID
 * @param profile   - Full profiles row
 * @param dietPlan  - Active diet_plans.plan_json (may be null)
 * @param language  - 'en' | 'ar'
 */
export async function generateSupplementRecsIfElite(
  supabase: any,
  client: Anthropic,
  userId: string,
  profile: any,
  dietPlan: any,
  language: 'en' | 'ar' = 'en',
) {
  // Skip if not elite (unless in launch mode)
  if (!isLaunchMode()) {
    const sub = await getUserSubscription(userId)
    const plan = effectivePlan(sub)
    if (plan !== 'elite') return
  }

  // Cycle numbering
  const { count } = await supabase
    .from('supplement_recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  const cycleNumber = (count ?? 0) + 1

  // ── Diet context ─────────────────────────────────────────────────
  const dietContext = dietPlan
    ? [
        `Daily calories: ${dietPlan.daily_calories ?? '?'} kcal`,
        `Protein: ${dietPlan.protein_g ?? '?'}g`,
        `Carbs: ${dietPlan.carbs_g ?? '?'}g`,
        `Fat: ${dietPlan.fat_g ?? '?'}g`,
        `Water: ${dietPlan.water_l ?? 2.5}L`,
        `Meals/day: ${profile.meals_per_day || '?'}`,
        `Dietary preference: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'balanced'}`,
        `Allergies: ${profile.allergies || 'none'}`,
        `Foods loved: ${profile.foods_loved || 'not specified'}`,
        `Current supplements: ${Array.isArray(profile.supplements) ? profile.supplements.join(', ') : profile.supplements || 'none'}`,
      ].join(' | ')
    : `No active diet plan. Dietary preference: ${Array.isArray(profile.dietary_preference) ? profile.dietary_preference.join(', ') : profile.dietary_preference || 'balanced'}. Allergies: ${profile.allergies || 'none'}.`

  // ── Profile-derived flags to guide vitamin selection ─────────────
  const dietPrefs: string[] = Array.isArray(profile.dietary_preference)
    ? profile.dietary_preference.map((d: string) => d.toLowerCase())
    : (profile.dietary_preference || '').toLowerCase().split(/[,\s]+/).filter(Boolean)

  const isVegan = dietPrefs.some(d => d.includes('vegan'))
  const isVegetarian = !isVegan && dietPrefs.some(d => d.includes('vegetarian'))
  const isFemale = profile.gender === 'female'
  const hasPoorSleep = /poor|bad|very poor/i.test(profile.sleep_quality || '')
  const hasHighStress = /high|severe/i.test(profile.stress_level || '')
  const trainingDays = parseInt(profile.training_days) || 3
  const isIntenseTraining = trainingDays >= 5
  const losesFat = profile.goal === 'lose_fat'
  const buildsMuscle = profile.goal === 'build_muscle' || profile.goal === 'recomposition'

  // InBody-derived flags
  const visceralFat     = profile.visceral_fat != null ? Number(profile.visceral_fat) : null
  const inbodyScore     = profile.inbody_score != null ? Number(profile.inbody_score) : null
  const bodyFatPct      = profile.body_fat_pct != null ? Number(profile.body_fat_pct) : null
  const hasHighVisceral = visceralFat != null && visceralFat > 10
  const hasMedVisceral  = visceralFat != null && visceralFat > 7 && visceralFat <= 10
  const hasLowInbody    = inbodyScore != null && inbodyScore < 70
  const hasHighBF       = bodyFatPct != null && (isFemale ? bodyFatPct > 30 : bodyFatPct > 25)

  const vitaminFlags = [
    isVegan && '🔴 VEGAN: B12 deficiency risk — must include Methylcobalamin B12. Include algae-based Omega-3 DHA/EPA. Zinc and Iron can be low on plant-based diets — assess.',
    isVegetarian && '🟡 VEGETARIAN: Moderate B12 risk if no eggs/dairy — include B12. Consider Omega-3 algae or fish oil.',
    isFemale && '🟡 FEMALE: Iron is commonly low, especially with regular exercise — assess. Folate/B9 important. Calcium + D3 for bone density.',
    hasPoorSleep && '🔴 POOR SLEEP QUALITY: Magnesium Glycinate (essential, not oxide) is priority. Consider L-Theanine 200mg before bed.',
    hasHighStress && '🟡 HIGH STRESS: Include Ashwagandha (adaptogen, 600mg KSM-66). Magnesium helps. B-Complex for adrenal support.',
    isIntenseTraining && `🟡 INTENSE TRAINING (${trainingDays} days/week): Electrolytes (sodium, potassium, magnesium) important. B-Complex for energy metabolism. Tart Cherry or Beetroot for recovery.`,
    losesFat && '🟡 FAT LOSS: Ensure adequate micronutrient density — multi if diet is restricted. Chromium can help blood sugar regulation.',
    buildsMuscle && '🟡 MUSCLE BUILDING: Creatine Monohydrate is essential evidence-based — always include if not already taking.',
    hasHighVisceral && `🔴 HIGH VISCERAL FAT (InBody level ${visceralFat}): PRIORITY — Omega-3 EPA/DHA (2–3g/day) for cardiovascular protection. Berberine 500mg 2x/day or CLA may help visceral fat reduction. Include CoQ10 for heart health. Reduce saturated fat intake.`,
    hasMedVisceral && `🟡 MODERATE VISCERAL FAT (InBody level ${visceralFat}): Include Omega-3 EPA/DHA. Monitor metabolic markers. Prioritise aerobic + resistance training combination.`,
    hasHighBF && !hasHighVisceral && `🟡 ELEVATED BODY FAT (${bodyFatPct}%): CLA or Green Tea Extract (EGCG) may support fat oxidation. Chromium for blood sugar regulation.`,
    hasLowInbody && `🟡 LOW INBODY SCORE (${inbodyScore}/100): Focus on foundational supplements — Creatine, Protein timing, Vitamin D3, Magnesium — to improve overall body composition score.`,
    '🔵 FOUNDATION: Vitamin D3 (especially for indoor training or low sun exposure), Magnesium (most people are deficient), Omega-3 (if low oily fish intake).',
  ].filter(Boolean).join('\n')

  const prompt = `You are Ion, an elite AI personal trainer and sports nutritionist. Create a complete, personalised supplement and vitamin stack for this user's current plan cycle.

${aiLanguageInstruction(language, 'all user-facing JSON string values including headline, benefit, timing, notes, stack_notes')}

USER:
Name: ${profile.name} | Age: ${profile.age} | Gender: ${profile.gender}
Goal: ${profile.goal}${profile.goal_target ? ` → ${profile.goal_target}` : ''}
Weight: ${profile.weight_kg}kg | Height: ${profile.height_cm}cm
Injuries: ${profile.injuries || 'None'} | Medical: ${profile.medical_conditions || 'None'}
Sleep quality: ${profile.sleep_quality || 'average'} | Stress: ${profile.stress_level || 'moderate'}${visceralFat != null || inbodyScore != null || bodyFatPct != null ? `
InBody scan: BF% ${bodyFatPct ?? '?'}% | Visceral fat level ${visceralFat ?? '?'}${hasHighVisceral ? ' (HIGH RISK)' : ''} | InBody score ${inbodyScore ?? '?'}/100${profile.muscle_mass_kg ? ` | Muscle mass ${profile.muscle_mass_kg}kg` : ''}${profile.bmr_kcal ? ` | Measured BMR ${profile.bmr_kcal} kcal` : ''}` : ''}

NUTRITION & TRAINING CONTEXT:
${dietContext}

VITAMIN/DEFICIENCY FLAGS — READ CAREFULLY:
${vitaminFlags}

INSTRUCTIONS:
1. Include ALL vitamins and minerals that are relevant given the flags above — do NOT skip vitamins just because they seem basic. Vitamin D3, Magnesium, and Omega-3 should almost always appear unless the user's diet clearly covers them.
2. Use categories: Performance | Recovery | Health | Vitamin | Mineral | Adaptogen
3. Always specify exact dose with unit (e.g. "5g", "2000 IU", "400mg").
4. For timing be specific: "Morning with food", "30 min pre-workout", "Before bed on empty stomach", etc.
5. Prioritise: essential = non-negotiable for this user, recommended = clear benefit, optional = situational.
6. Do not recommend supplements that conflict with the user's allergies or medical conditions.
7. Do not recommend stimulants if the user has anxiety or heart conditions.
8. Include 5–10 total items (supplements + vitamins + minerals).

Return ONLY valid JSON:
{
  "headline": "One-line summary of this stack's rationale for this specific user",
  "supplements": [
    {
      "name": "Exact supplement name",
      "category": "Performance|Recovery|Health|Vitamin|Mineral|Adaptogen",
      "dose": "Exact dose with unit",
      "timing": "Specific when and how to take",
      "benefit": "Specific benefit tied to this user's goal and profile",
      "evidence": "strong|moderate|emerging",
      "priority": "essential|recommended|optional",
      "notes": "Important interactions, food sources, cycling advice, or brand quality tips"
    }
  ],
  "stack_notes": "Ion's overall 2-3 sentence coaching note about this stack — reference the user's specific situation",
  "cycle": ${cycleNumber}
}`

  const aiMsg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  await recordAiUsage({
    userId,
    feature: 'supplement_recommendations',
    model: aiMsg.model,
    usage: aiMsg.usage,
  })

  const raw = aiMsg.content[0].type === 'text' ? aiMsg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('[supplement-gen] Failed to parse JSON response')
  const recommendations = JSON.parse(match[0])

  await supabase.from('supplement_recommendations').insert({
    user_id:         userId,
    cycle_number:    cycleNumber,
    recommendations: recommendations,
    generated_at:    new Date().toISOString(),
  })
}
