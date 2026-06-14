import { apiFetch } from '@/lib/api'

export type Measurement = {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg?: number | null
  neck_cm?: number | null
  shoulders_cm?: number | null
  waist_cm: number | null
  chest_cm: number | null
  hips_cm?: number | null
  bicep_left_cm?: number | null
  bicep_right_cm?: number | null
  forearm_left_cm?: number | null
  forearm_right_cm?: number | null
  thigh_left_cm?: number | null
  thigh_right_cm?: number | null
  calf_left_cm?: number | null
  calf_right_cm?: number | null
  wrist_cm?: number | null
  ankle_cm?: number | null
  notes: string | null
}

export async function getMeasurements() {
  return apiFetch<{ measurements: Measurement[] }>('/api/measurements')
}

export async function createMeasurement(payload: Partial<Measurement>) {
  return apiFetch<{ measurement: Measurement }>('/api/measurements', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type PlanReadinessLift = {
  name: string
  weight_kg: number | null
  reps: number | null
  daysAgo: number | null
  fresh: boolean
}

export type PlanReadiness = {
  weight: { value: number | null; daysAgo: number | null; fresh: boolean }
  measurements: { waist_cm: number | null; chest_cm: number | null; hips_cm: number | null; daysAgo: number | null; fresh: boolean }
  inbody: { present: boolean; body_fat_pct: number | null; muscle_mass_kg: number | null; bmr_kcal: number | null; daysAgo: number | null; fresh: boolean }
  workout: {
    lastSession: { date: string | null; daysAgo: number | null; fresh: boolean }
    compliance: { actual: number; expected: number; pct: number; fresh: boolean }
    lifts: PlanReadinessLift[]
    goal: string | null
  }
}

export async function getPlanReadiness() {
  return apiFetch<PlanReadiness>('/api/me/plan-readiness')
}

export async function analyzeInBodyPhoto(image: string, mimeType = 'image/jpeg') {
  return apiFetch<{ success: boolean; data: Record<string, unknown> }>('/api/analyze-inbody', {
    method: 'POST',
    body: JSON.stringify({ image, mimeType }),
  })
}
