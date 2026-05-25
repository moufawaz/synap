import { apiFetch } from '@/lib/api'

export type MobileProfileInput = {
  name: string
  age: string
  gender: 'male' | 'female'
  weight_kg: string
  height_cm: string
  goal: string
  currently_training: 'new' | 'already'
  gym_access: 'gym' | 'home'
  training_days: string
  session_duration: string
  meals_per_day: string
  foods_loved: string
  foods_hated: string
  injuries: string
  language: 'en' | 'ar'
  ion_gender: 'male' | 'female'
}

export async function saveMobileProfile(profile: MobileProfileInput) {
  return apiFetch<{ success: boolean }>('/api/save-profile', {
    method: 'POST',
    body: JSON.stringify({ data: profile }),
  })
}

export async function generateMobilePlan(profile: MobileProfileInput) {
  return apiFetch<{ success: boolean; workout_plan_id: string; diet_plan_id: string }>('/api/generate-plan', {
    method: 'POST',
    body: JSON.stringify({ profileData: profile }),
  })
}
