import { createAdminClient } from '@/lib/supabase-server'

// ── Daily message limits by tier ──────────────────────────────
// Starter: 5/day for first 7 days, then upgrade wall (see canSendMessage)
// Pro / Elite / Trial: unlimited
export const DAILY_LIMITS: Record<string, number> = {
  starter:   5,
  free:      5,      // legacy alias
  trial:     Infinity,
  pro:       Infinity,
  elite:     Infinity,
  unlimited: Infinity, // legacy alias
}

// ── Starter trial period (days from account creation) ─────────
export const STARTER_TRIAL_DAYS = 7

// ── Is LAUNCH_MODE active? ─────────────────────────────────────
export function isLaunchMode(): boolean {
  return process.env.LAUNCH_MODE === 'true'
}

// ── Get subscription row for a user ───────────────────────────
// Uses service-role key — bypasses RLS, always returns real data.
export async function getUserSubscription(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

// ── Effective plan tier (accounting for trial/expiry) ─────────
export function effectivePlan(sub: any): 'starter' | 'trial' | 'pro' | 'elite' {
  if (!sub) return 'starter'

  if (sub.status === 'trial') {
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    if (!trialEnd || trialEnd > new Date()) return 'trial'
    return 'starter'
  }

  if (sub.status === 'active') {
    const name = (sub.plan_type || sub.plan_name || '').toLowerCase()
    if (name === 'elite')    return 'elite'
    if (name === 'pro')      return 'pro'
    if (name === 'unlimited') return 'pro'   // legacy → pro
    return 'starter'
  }

  if (sub.status === 'cancelled') {
    const periodEnd = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null
    if (periodEnd && periodEnd > new Date()) {
      const name = (sub.plan_type || sub.plan_name || '').toLowerCase()
      if (name === 'elite')    return 'elite'
      if (name === 'pro')      return 'pro'
      if (name === 'unlimited') return 'pro'
    }
    return 'starter'
  }

  return 'starter'
}

// ── Get today's message count ──────────────────────────────────
export async function getTodayMessageCount(userId: string): Promise<number> {
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.rpc('increment_message_usage', { p_user_id: userId, p_date: today })
}

// ── Check if user can send a message ──────────────────────────
// Pass userCreatedAt (from auth.getUser()) so we can check Starter trial window
// without requiring service-role admin API access.
export async function canSendMessage(userId: string, userCreatedAt?: string): Promise<{
  allowed: boolean
  used: number
  limit: number
  plan: string
  reason?: 'daily_limit_reached' | 'starter_expired'
}> {
  if (isLaunchMode()) return { allowed: true, used: 0, limit: Infinity, plan: 'pro' }

  const [sub, used] = await Promise.all([
    getUserSubscription(userId),
    getTodayMessageCount(userId),
  ])

  const plan = effectivePlan(sub)

  // Paid tiers (pro / elite / trial) — unlimited, always allow
  if (plan !== 'starter') {
    return { allowed: true, used, limit: Infinity, plan }
  }

  // ── Starter tier: check account age ───────────────────────────
  if (userCreatedAt) {
    const createdAt = new Date(userCreatedAt)
    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSignup >= STARTER_TRIAL_DAYS) {
      // Starter trial expired — full upgrade wall
      return { allowed: false, used, limit: 0, plan: 'starter', reason: 'starter_expired' }
    }
  }

  // Within Starter trial — enforce 5/day
  const limit = DAILY_LIMITS.starter
  if (used >= limit) {
    return { allowed: false, used, limit, plan: 'starter', reason: 'daily_limit_reached' }
  }

  return { allowed: true, used, limit, plan: 'starter' }
}

// ── Trial / plan helpers ───────────────────────────────────────
export function getTrialDaysRemaining(sub: any): number | null {
  if (!sub || sub.status !== 'trial') return null
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
  if (!trialEnd) return null
  const diff = trialEnd.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function isProUser(sub: any): boolean {
  const plan = effectivePlan(sub)
  return plan === 'pro' || plan === 'elite' || plan === 'trial'
}

export function isEliteUser(sub: any): boolean {
  return effectivePlan(sub) === 'elite'
}

export function isUnlimited(sub: any): boolean {
  // Pro and Elite both have unlimited messages
  const plan = effectivePlan(sub)
  return plan === 'pro' || plan === 'elite' || plan === 'trial'
}
