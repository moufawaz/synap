import { createAdminClient } from '@/lib/supabase-server'

export const DAILY_LIMITS: Record<string, number> = {
  starter: 5,
  free: 5,
  trial: Infinity,
  pro: Infinity,
  elite: Infinity,
  unlimited: Infinity,
}

export const STARTER_TRIAL_DAYS = 7

export function isLaunchMode(): boolean {
  return process.env.LAUNCH_MODE === 'true' || process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'
}

export async function getUserSubscription(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export function effectivePlan(sub: any): 'starter' | 'trial' | 'pro' | 'elite' {
  if (isLaunchMode()) return 'elite'
  if (!sub) return 'starter'

  if (sub.status === 'trial') {
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    if (!trialEnd || trialEnd > new Date()) {
      const paidTier = planTierFromSubscription(sub)
      return paidTier === 'starter' ? 'trial' : paidTier
    }
    return 'starter'
  }

  if (sub.status === 'active') {
    return planTierFromSubscription(sub)
  }

  if (sub.status === 'cancelled') {
    const periodEnd = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null
    if (periodEnd && periodEnd > new Date()) {
      return planTierFromSubscription(sub)
    }
    return 'starter'
  }

  return 'starter'
}

function planTierFromSubscription(sub: any): 'starter' | 'pro' | 'elite' {
  const label = `${sub?.plan_type || ''} ${sub?.plan_name || ''}`.toLowerCase()
  if (label.includes('elite')) return 'elite'
  if (label.includes('pro') || label.includes('unlimited')) return 'pro'
  return 'starter'
}

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

export async function incrementMessageCount(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.rpc('increment_message_usage', { p_user_id: userId, p_date: today })
}

export async function canSendMessage(userId: string, userCreatedAt?: string): Promise<{
  allowed: boolean
  used: number
  limit: number
  plan: string
  reason?: 'daily_limit_reached' | 'starter_expired'
}> {
  if (isLaunchMode()) return { allowed: true, used: 0, limit: Infinity, plan: 'elite' }

  const [sub, used] = await Promise.all([
    getUserSubscription(userId),
    getTodayMessageCount(userId),
  ])

  const plan = effectivePlan(sub)

  if (plan !== 'starter') {
    return { allowed: true, used, limit: Infinity, plan }
  }

  if (userCreatedAt) {
    const createdAt = new Date(userCreatedAt)
    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSignup >= STARTER_TRIAL_DAYS) {
      return { allowed: false, used, limit: 0, plan: 'starter', reason: 'starter_expired' }
    }
  }

  const limit = DAILY_LIMITS.starter
  if (used >= limit) {
    return { allowed: false, used, limit, plan: 'starter', reason: 'daily_limit_reached' }
  }

  return { allowed: true, used, limit, plan: 'starter' }
}

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
  const plan = effectivePlan(sub)
  return plan === 'pro' || plan === 'elite' || plan === 'trial'
}
