import { apiFetch } from '@/lib/api'

export type Profile = Record<string, any>

export async function getProfile() {
  return apiFetch<{ profile: Profile | null }>('/api/save-profile')
}

export async function saveProfile(data: Profile) {
  return apiFetch<{ success: boolean }>('/api/save-profile', {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function getSupplementRecommendations() {
  return apiFetch<{ recommendation: any | null }>('/api/supplement-recommendations')
}

export async function generateSupplementRecommendations() {
  return apiFetch<{ recommendation: any | null }>('/api/supplement-recommendations', {
    method: 'POST',
  })
}

export async function runMacroAdjustment() {
  return apiFetch<{ adjustment?: any; previousTargets?: any; message?: string }>('/api/macro-adjustment', {
    method: 'POST',
  })
}
