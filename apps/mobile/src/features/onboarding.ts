import { apiFetch } from '@/lib/api'

/**
 * Full onboarding payload — mirrors the web onboarding flow (src/lib/onboardingFlow.ts)
 * so mobile-generated plans get the same rich context as the web. The save-profile
 * API reads these exact field names; comma-separated strings are split into arrays
 * server-side (equipment, supplements, dietary_preference).
 */
export type MobileProfileInput = {
  // Identity
  name: string
  age: string
  gender: 'male' | 'female'
  ion_gender: 'male' | 'female'
  language: 'en' | 'ar'
  weight_kg: string
  height_cm: string
  // Goal
  goal: string
  goal_speed: string          // slow | moderate | aggressive
  goal_target: string         // optional free text
  goal_date: string           // optional free text
  // Daily life
  work_schedule: string       // work | study | both | neither
  work_hours: string
  wake_time: string
  sleep_time: string
  lunch_break: string
  stress_level: string        // low | moderate | high
  sleep_quality: string       // solid | average | struggling
  // Training
  currently_training: string  // already | fresh
  current_training_desc: string
  gym_access: 'gym' | 'home'
  equipment: string           // csv: bodyweight,bands,dumbbells,pullup_bar,mixed
  training_days: string
  session_duration: string
  training_time: string       // morning | afternoon | evening | late_night
  training_style: string      // heavy_compound | machines | cables | mix
  exercises_hated: string
  strength_levels: string     // JSON string of { lift: kg }
  // Nutrition
  foods_loved: string
  foods_hated: string
  dietary_preference: string  // csv
  allergies: string
  meals_per_day: string
  cooking_ability: string     // cook | quick | eat_out
  food_budget: string         // tight | moderate | flexible
  // Health
  injuries: string
  medical_conditions: string
  supplements: string         // csv
}

export async function saveMobileProfile(profile: MobileProfileInput) {
  return apiFetch<{ success: boolean }>('/api/save-profile', {
    method: 'POST',
    body: JSON.stringify({ data: profile }),
  })
}

/**
 * Generate a plan. Generation is split into two phases so each request finishes
 * well within the serverless time limit (Vercel Hobby caps at 60s): the workout
 * plan first, then the nutrition plan. The onboarding screen calls 'workout'
 * then 'diet' and shows progress across both.
 */
export async function generateMobilePlan(
  profile: MobileProfileInput,
  phase: 'workout' | 'workout2' | 'diet' | 'videos' | 'all' = 'all',
) {
  return apiFetch<{ success: boolean; phase?: string; workout_plan_id?: string; diet_plan_id?: string }>(
    '/api/generate-plan',
    {
      method: 'POST',
      body: JSON.stringify({ profileData: profile, phase }),
      // Each phase is well under 60s server-side; allow generous client headroom.
      timeoutMs: 90_000,
    },
  )
}
