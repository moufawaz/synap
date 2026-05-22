import { apiFetch } from '@/lib/api'

export async function getGroceryList() {
  return apiFetch<{ groups: Array<{ category: string; category_label: string; items: any[] }>; generated_at: string }>('/api/grocery-list')
}

export async function getEatingOutRecommendation(situation: string) {
  return apiFetch<{ recommendation: any; remaining: any; targets: any }>('/api/eating-out', {
    method: 'POST',
    body: JSON.stringify({ situation }),
  })
}

export async function checkExerciseForm(input: { exercise: string; image: string; mimeType?: string }) {
  return apiFetch<{ feedback: any }>('/api/form-check', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getWeeklyReports() {
  return apiFetch<{ reports: any[] }>('/api/weekly-report')
}

export async function getMonthlySummary() {
  return apiFetch<{ summary: string; stats: any }>('/api/monthly-summary')
}

export async function requestTestPush() {
  return apiFetch<any>('/api/push-notification', {
    method: 'POST',
    body: JSON.stringify({
      type: 'general',
      overrides: { title: 'SYNAP', body: 'Push notification test from the native app.' },
    }),
  })
}

export async function registerDeviceToken(input: { token: string; provider?: 'expo'; platform?: string }) {
  return apiFetch<{ ok: true }>('/api/device-token', {
    method: 'POST',
    body: JSON.stringify({
      provider: input.provider || 'expo',
      token: input.token,
      platform: input.platform,
    }),
  })
}
