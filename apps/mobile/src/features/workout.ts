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

type RenewPreviewResponse = {
  ok: boolean
  action: 'preview'
  previewId: string
  preview: any
  plan: any
  phase_status?: string
  /** Server-driven phase chain: when set, the client should immediately POST
   *  again with `phase: next_phase` and the same `previewId`. When null/absent
   *  the preview is complete and ready for apply. Lets the server change the
   *  part count (3, 4, 5+) without ever needing a new mobile build. */
  next_phase?: string | null
}

const MAX_RENEW_CHAIN_HOPS = 8 // safety stop — current server is 4 phases
/** Per-phase client timeout. Must be slightly above the server's 60s function
 *  cap so the client doesn't abort before the server's own timeout response
 *  has time to arrive. 65s = 60s server cap + 5s network/parse buffer. Going
 *  lower (the 55s we had) caused false "took too long" alerts on phases that
 *  ran a coherence retry and legitimately neared the cap. */
const RENEW_PHASE_TIMEOUT_MS = 65_000

/**
 * Renewal flow:
 *   - Diet: one call. Output fits the 60s Vercel function window.
 *   - Workout: server-driven chain. Part 1 returns `next_phase`; we follow
 *     until `next_phase` is null. Each call stays under 60s on Opus.
 */
export async function renewPlan(planType: 'diet' | 'workout', context?: RenewalContext): Promise<RenewPreviewResponse> {
  if (planType === 'diet') {
    return apiFetch<RenewPreviewResponse>('/api/renew-plan', {
      method: 'POST',
      body: JSON.stringify({ action: 'preview', planType, context }),
      timeoutMs: 90_000,
    })
  }

  // ── Workout: follow next_phase chain ─────────────────────────────────
  let current = await apiFetch<RenewPreviewResponse>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', planType: 'workout', phase: 'workout-part1', context }),
    timeoutMs: RENEW_PHASE_TIMEOUT_MS,
  })
  if (!current?.previewId) {
    throw new Error('Workout renewal part 1 did not return a previewId')
  }
  for (let hop = 0; hop < MAX_RENEW_CHAIN_HOPS; hop++) {
    if (!current.next_phase) return current
    current = await apiFetch<RenewPreviewResponse>('/api/renew-plan', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        planType: 'workout',
        phase: current.next_phase,
        previewId: current.previewId,
        context,
      }),
      timeoutMs: RENEW_PHASE_TIMEOUT_MS,
    })
  }
  throw new Error('Workout renewal chain exceeded safety limit')
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
