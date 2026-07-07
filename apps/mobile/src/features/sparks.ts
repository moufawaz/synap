import { apiFetch } from '@/lib/api'

/**
 * ⚡ Sparks — behavior-based loyalty points, redeemable for free Elite days.
 * All economy numbers (reward costs, earning values) come from the server so
 * rebalancing never needs an app build.
 */

export type SparkLedgerEntry = { event_type: string; points: number; created_at: string }

export type SparkRewardCatalog = Record<string, { cost: number; days: number }>
export type SparkEarningCatalog = Record<string, { points: number }>

export type SparksInfo = {
  balance: number
  history: SparkLedgerEntry[]
  bonusEliteUntil: string | null
  rewards: SparkRewardCatalog
  earning: SparkEarningCatalog
}

export async function getSparks() {
  return apiFetch<SparksInfo>('/api/me/sparks')
}

export async function redeemSparks(reward: string) {
  return apiFetch<{ ok: boolean; reward: string; daysGranted: number; bonusEliteUntil: string; balance: number }>(
    '/api/me/sparks/redeem',
    { method: 'POST', body: JSON.stringify({ reward }) },
  )
}
