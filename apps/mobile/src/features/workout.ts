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

type RenewPreviewResponse = { ok: boolean; action: 'preview'; previewId: string; preview: any; plan: any; phase_status?: string }

/**
 * Renewal flow:
 *   - Diet: one call. Output fits in the 60s Vercel function window.
 *   - Workout: THREE calls, chained. The full 6-week plan runs ~5–7k output
 *     tokens which no model reliably finishes in a single 60s invocation, and
 *     a 2-phase Sonnet split also tipped 60s for half the days. 3-phase
 *     Opus emits ~1500-2000 tokens per call (~30-40s) and reliably fits.
 *
 *     Part 1: plan metadata + ceil(N/3) training days. Server creates the
 *             preview row tagged 'awaiting_part2'.
 *     Part 2: next ceil((N - part1) / 2) training days. Merged into the row,
 *             tagged 'awaiting_part3'.
 *     Part 3: remaining training days. Merged in, tagged 'complete'.
 *
 *     applyRenewalPreview() rejects anything not 'complete'. The
 *     PlanGenerating overlay animates 0–100% over the full sequence so the
 *     user sees one continuous load (~90-120s end-to-end).
 */
export async function renewPlan(planType: 'diet' | 'workout', context?: RenewalContext) {
  if (planType === 'diet') {
    return apiFetch<RenewPreviewResponse>('/api/renew-plan', {
      method: 'POST',
      body: JSON.stringify({ action: 'preview', planType, context }),
      timeoutMs: 90_000,
    })
  }

  // ── Workout: three-phase chain ───────────────────────────────────────
  const part1 = await apiFetch<RenewPreviewResponse>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', planType: 'workout', phase: 'workout-part1', context }),
    timeoutMs: 55_000,
  })
  if (!part1?.previewId) {
    throw new Error('Workout renewal part 1 did not return a previewId')
  }
  await apiFetch<RenewPreviewResponse>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', planType: 'workout', phase: 'workout-part2', previewId: part1.previewId, context }),
    timeoutMs: 55_000,
  })
  // Part 3 is the final merge — it returns the complete preview ready for apply.
  return apiFetch<RenewPreviewResponse>('/api/renew-plan', {
    method: 'POST',
    body: JSON.stringify({ action: 'preview', planType: 'workout', phase: 'workout-part3', previewId: part1.previewId, context }),
    timeoutMs: 55_000,
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
