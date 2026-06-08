import { apiFetch } from '@/lib/api'

export type SubscriptionStatus = {
  tier: 'starter' | 'trial' | 'pro' | 'elite'
  status: string | null
  planName: string | null
  isTrial?: boolean
  trialDaysLeft?: number | null
}

export async function getSubscriptionStatus() {
  return apiFetch<SubscriptionStatus>('/api/me/subscription')
}
