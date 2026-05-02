import { createServerClient } from '@/lib/supabase-server'

// ── Daily message limits by plan ──────────────────────────────
export const DAILY_LIMITS: Record<string, number> = {
  free:      5,
  trial:     30,   // trial gets pro limits
  pro:       30,
  unlimited: Infinity,
}

// ── Is LAUNCH_MODE active? ─────────────────────────────────────
export function isLaunchMode(): boolean {
  return process.env.LAUNCH_MODE === 'true'
}

// ── Get subscription row for a user ───────────────────────────
export async function getUserSubscription(userId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

// ── Effective plan name (accounting for trial/expiry) ─────────
export function effectivePlan(sub: any): 'free' | 'trial' | 'pro' | 'unlimited' {
  if (!sub) return 'free'
  if (sub.status === 'trial') {
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    if (!trialEnd || trialEnd > new Date()) return 'trial'
    return 'free'
  }
  if (sub.status === 'active') {
    return (sub.plan_name as 'pro' | 'unlimited') || 'free'
  }
  if (sub.status === 'cancelled') {
    // Still active until period ends
    const periodEnd = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null
    if (periodEnd && periodEnd > new Date()) return (sub.plan_name as 'pro' | 'unlimited') || 'free'
    return 'free'
  }
  return 'free'
}

// ── Get daily message limit for a user ────────────────────────
export async function getDailyLimit(userId: string): Promise<number> {
  if (isLaunchMode()) return Infinity

  const sub = await getUserSubscription(userId)
  const plan = effectivePlan(sub)

  // Check for extra chat add-on
  if (plan !== 'unlimited') {
    const supabase = createServerClient()
    const { data: addon } = await supabase
      .from('add_ons')
      .select('id')
      .eq('user_id', userId)
      .eq('addon_type', 'extra_chat')
      .eq('active', true)
      .single()

    if (addon) {
      return (DAILY_LIMITS[plan] || 5) + 20
    }
  }

  return DAILY_LIMITS[plan] ?? 5
}

// ── Get today's message count ──────────────────────────────────
export async function getTodayMessageCount(userId: string): Promise<number> {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('message_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  return data?.count || 0
}

// ── Increment daily message count ─────────────────────────────
export async function incrementMessageCount(userId: string): Promise<void> {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.rpc('increment_message_usage', { p_user_id: userId, p_date: today })
}

// ── Check if user can send a message ──────────────────────────
export async function canSendMessage(userId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
  plan: string
}> {
  if (isLaunchMode()) return { allowed: true, used: 0, limit: Infinity, plan: 'unlimited' }

  const [limit, used, sub] = await Promise.all([
    getDailyLimit(userId),
    getTodayMessageCount(userId),
    getUserSubscription(userId),
  ])

  const plan = effectivePlan(sub)

  return {
    allowed: limit === Infinity || used < limit,
    used,
    limit,
    plan,
  }
}

// ── Trial helpers ──────────────────────────────────────────────
export function getTrialDaysRemaining(sub: any): number | null {
  if (!sub || sub.status !== 'trial') return null
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
  if (!trialEnd) return null
  const diff = trialEnd.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function isProUser(sub: any): boolean {
  const plan = effectivePlan(sub)
  return plan === 'pro' || plan === 'unlimited' || plan === 'trial'
}

export function isUnlimited(sub: any): boolean {
  return effectivePlan(sub) === 'unlimited'
}
