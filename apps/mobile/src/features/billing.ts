import { apiFetch } from '@/lib/api'

export type MobileBillingStatus = {
  nativeIapReady: false
  reason: string
  webBillingAvailable: false
}

export function getMobileBillingStatus(): MobileBillingStatus {
  return {
    nativeIapReady: false,
    webBillingAvailable: false,
    reason: 'Apple In-App Purchase products are not configured yet. The iOS app does not open external checkout for digital subscriptions.',
  }
}

export async function cancelWebSubscription() {
  return apiFetch<{ ok: boolean; message: string }>('/api/billing/cancel', {
    method: 'POST',
  })
}
