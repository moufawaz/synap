import { apiFetch } from '@/lib/api'

export type MobileBillingStatus = {
  nativeIapReady: false
  reason: string
  webBillingAvailable: true
}

export function getMobileBillingStatus(): MobileBillingStatus {
  return {
    nativeIapReady: false,
    webBillingAvailable: true,
    reason: 'Apple In-App Purchase products are not configured yet. Web billing remains available outside iOS.',
  }
}

export async function cancelWebSubscription() {
  return apiFetch<{ ok: boolean; message: string }>('/api/billing/cancel', {
    method: 'POST',
  })
}
