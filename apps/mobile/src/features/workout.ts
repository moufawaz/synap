import { apiFetch } from '@/lib/api'

export type WorkoutExercise = {
  index: number
  name: string
  sets: number | null
  reps: string | number | null
  rest_sec: number | null
  muscle_group: string | null
  weight_guidance?: string | null
  form_tip?: string | null
  progression_note?: string | null
  video_id: string | null
}

export type TodayWorkout = {
  day_name: string
  muscle_focus: string | null
  duration_min: number | null
  is_rest_day: boolean
  exercises: WorkoutExercise[]
}

export type PlanHistoryResponse = {
  diet: any[]
  workout: any[]
  activeDietPlan: { id: string; created_at: string; plan_json: any } | null
  activeWorkoutPlan: { id: string; created_at: string; plan_json: any } | null
  todayWorkout: TodayWorkout | null
  timing?: {
    diet?: { label: string; daysLeft: number; expired: boolean } | null
    workout?: { label: string; daysLeft: number; expired: boolean } | null
  }
}

export type WorkoutSession = {
  session_type?: string
  date: string
  dayName?: string
  completedExercises: number[]
  exercisePerformance?: Record<string, unknown>
  updatedAt?: string
}

export async function getPlanHistory() {
  return apiFetch<PlanHistoryResponse>('/api/plan-history')
}

export type RenewalContext = {
  lifts?: Array<{ name: string; weight_kg: number; reps: number }>
  flags?: string[]
}

export async function renewPlan(planType: 'diet' | 'workout', context?: RenewalContext) {
  // Renewal runs a full Opus regeneration; the server's hard limit is 60s, so
  // give the client a matching window — otherwise the default 45s fetch timeout
  // would surface "took too long" before the server even finishes.
  return apiFetch<{ ok: boolean; action: 'preview'; previewId: string; preview: any; plan: any }>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', planType, context }),
    timeoutMs: 90_000,
  })
}

export async function applyRenewalPreview(previewId: string) {
  return apiFetch<{ ok: boolean; action: 'apply'; planType: 'diet' | 'workout'; plan: any }>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'apply', previewId }),
    timeoutMs: 30_000,
  })
}

export async function rollbackPlan(planType: 'diet' | 'workout', targetPlanId?: string) {
  return apiFetch<{ ok: boolean; action: 'rollback'; planType: 'diet' | 'workout'; restoredPlanId: string; plan: any }>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'rollback', planType, targetPlanId }),
  })
}

export async function getWorkoutSession(date: string) {
  return apiFetch<{ session: WorkoutSession | null }>(`/api/workout-session?date=${encodeURIComponent(date)}`)
}

export async function saveWorkoutSession(session: WorkoutSession) {
  return apiFetch<{ ok: boolean }>('/api/workout-session', {
    method: 'PUT',
    body: JSON.stringify(session),
  })
}

export async function clearWorkoutSession() {
  return apiFetch<{ ok: boolean }>('/api/workout-session', { method: 'DELETE' })
}

export async function logWorkout(payload: {
  date: string
  day_name: string
  duration_min: number
  exercises_completed: number
  total_exercises: number
  exercises: Array<{ name: string; completed: boolean }>
  exercisePerformance?: Record<string, unknown>
  notes?: string | null
}) {
  return apiFetch<{ log: unknown }>('/api/log-workout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
