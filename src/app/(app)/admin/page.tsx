import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  Users, MessageCircle, Crown, DollarSign,
  TrendingUp, Zap, Activity, ExternalLink as ExternalLinkIcon,
  XCircle, BarChart3, Dumbbell, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react'
import { estimateAnthropicCostUsd, formatUsd, TOKEN_PRICING } from '@/lib/token-cost'

export const dynamic = 'force-dynamic'

const PLAN_PRICES: Record<string, number> = {
  'pro-monthly':      39.99,
  'pro-annual':      319.99,
  'elite-monthly':    69.99,
  'elite-annual':    559.99,
  'unlimited-monthly': 39.99,
  'unlimited-annual': 319.99,
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  subscription_created:         { label: 'Trial started',     color: '#BB5CF6' },
  subscription_updated:         { label: 'Sub updated',       color: '#3B82F6' },
  subscription_cancelled:       { label: 'Cancelled',         color: '#EF4444' },
  subscription_resumed:         { label: 'Resumed',           color: '#10B981' },
  subscription_expired:         { label: 'Expired',           color: '#F59E0B' },
  subscription_payment_success: { label: 'Payment received',  color: '#10B981' },
  subscription_payment_failed:  { label: 'Payment failed',    color: '#EF4444' },
}

const GOAL_LABELS: Record<string, string> = {
  lose_fat:        'Lose Fat',
  build_muscle:    'Build Muscle',
  recomposition:   'Recomp',
  improve_fitness: 'Fitness',
  be_healthier:    'Health',
}

function getPlanTier(s: any): 'elite' | 'pro' | 'starter' {
  const p = (s.plan_type || s.plan_name || '').toLowerCase()
  if (p === 'elite')                  return 'elite'
  if (p === 'pro' || p === 'unlimited') return 'pro'
  return 'starter'
}

export default async function AdminPage() {
  // ── Auth guard ────────────────────────────────────────────────
  const supabase  = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // ── ALL queries use adminClient (service role — bypasses RLS) ─
  const admin = createAdminClient()

  const today   = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7  * 86400000).toISOString()
  const monthAgo= new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    authUsersRes,
    profilesRes,
    subsRes,
    billingEventsRes,
    chatCountRes,
    chatRowsRes,
    workoutLogCountRes,
    msgUsageRes,
    tokenMessagesRes,
    workoutPlansRes,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('user_id, name, goal, gender, created_at'),
    admin.from('subscriptions').select('*'),
    admin.from('billing_events')
      .select('event_type, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(25),
    // Real chat count: exclude system rows (workout_session etc.)
    admin.from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .in('role', ['user', 'assistant']),
    admin.from('chat_messages')
      .select('user_id, role, created_at')
      .in('role', ['user', 'assistant']),
    admin.from('workout_log').select('id', { count: 'exact', head: true }),
    // Full message_usage for per-user stats & today aggregation
    admin.from('message_usage').select('user_id, date, count'),
    admin.from('ai_usage_log')
      .select('user_id, feature, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, total_tokens, estimated_cost_usd, created_at'),
    // Users who have an active plan
    admin.from('workout_plans').select('user_id').eq('active', true),
  ])

  const authUsers     = authUsersRes.data?.users || []
  const profiles      = profilesRes.data || []
  const subs          = subsRes.data || []
  const events        = billingEventsRes.data || []
  const chatRows      = chatRowsRes.data || []
  const msgUsage      = msgUsageRes.data || []
  const tokenRows = tokenMessagesRes.data || []
  const tokenLogError = tokenMessagesRes.error?.message || null
  const planUserIds   = new Set((workoutPlansRes.data || []).map((r: any) => r.user_id))

  // ── Per-user message aggregation ─────────────────────────────
  const msgByUser: Record<string, { total: number; lastDate: string }> = {}
  for (const row of msgUsage) {
    if (!msgByUser[row.user_id]) msgByUser[row.user_id] = { total: 0, lastDate: '' }
    msgByUser[row.user_id].total += row.count || 0
    if (row.date > msgByUser[row.user_id].lastDate) msgByUser[row.user_id].lastDate = row.date
  }

  const chatByUser: Record<string, { total: number; userMessages: number; assistantMessages: number; lastDate: string }> = {}
  for (const row of chatRows) {
    if (!chatByUser[row.user_id]) chatByUser[row.user_id] = { total: 0, userMessages: 0, assistantMessages: 0, lastDate: '' }
    const bucket = chatByUser[row.user_id]
    bucket.total += 1
    if (row.role === 'user') bucket.userMessages += 1
    if (row.role === 'assistant') bucket.assistantMessages += 1
    const date = row.created_at?.slice(0, 10) || ''
    if (date > bucket.lastDate) bucket.lastDate = date
  }

  const tokenByUser: Record<string, {
    messages: number
    input: number
    output: number
    cacheWrite: number
    cacheRead: number
    total: number
    cost: number
    monthMessages: number
    monthInput: number
    monthOutput: number
    monthTotal: number
    monthCost: number
    lastDate: string
  }> = {}
  for (const row of tokenRows) {
    const createdDate = row.created_at?.slice(0, 10) || ''
    const isThisMonth = row.created_at >= monthAgo
    if (!tokenByUser[row.user_id]) {
      tokenByUser[row.user_id] = {
        messages: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0, total: 0, cost: 0,
        monthMessages: 0, monthInput: 0, monthOutput: 0, monthTotal: 0, monthCost: 0, lastDate: '',
      }
    }
    const bucket = tokenByUser[row.user_id]
    const input = row.input_tokens || 0
    const output = row.output_tokens || 0
    const cacheWrite = row.cache_write_tokens || 0
    const cacheRead = row.cache_read_tokens || 0
    const total = row.total_tokens || input + output + cacheWrite + cacheRead
    const cost = Number(row.estimated_cost_usd || 0) || estimateAnthropicCostUsd({
      input_tokens: input,
      output_tokens: output,
      cache_creation_input_tokens: cacheWrite,
      cache_read_input_tokens: cacheRead,
    }, row.model)
    bucket.input += input
    bucket.output += output
    bucket.cacheWrite += cacheWrite
    bucket.cacheRead += cacheRead
    bucket.total += total
    bucket.cost += cost
    if (isThisMonth) {
      bucket.monthInput += input
      bucket.monthOutput += output
      bucket.monthTotal += total
      bucket.monthCost += cost
    }
    bucket.messages += 1
    if (isThisMonth) bucket.monthMessages += 1
    if (createdDate > bucket.lastDate) bucket.lastDate = createdDate
  }

  // ── Subscription splits ───────────────────────────────────────
  const activeSubs    = subs.filter(s => s.status === 'active')
  const trialSubs     = subs.filter(s => s.status === 'trial')
  const cancelledSubs = subs.filter(s => s.status === 'cancelled' || s.status === 'expired')
  const eliteSubs     = activeSubs.filter(s => getPlanTier(s) === 'elite')
  const proSubs       = activeSubs.filter(s => getPlanTier(s) === 'pro')
  const totalUsers    = authUsers.length

  // ── MRR / ARR ─────────────────────────────────────────────────
  let mrr = 0
  for (const s of activeSubs) {
    const tier = getPlanTier(s)
    const key  = `${tier}-${s.billing_period || 'monthly'}`
    const price = PLAN_PRICES[key]
    if (price) mrr += s.billing_period === 'annual' ? price / 12 : price
  }
  const arr  = mrr * 12
  const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0

  // ── Billing event metrics ─────────────────────────────────────
  const trialsStarted   = events.filter(e => e.event_type === 'subscription_created').length
  const trialsCancelled = events.filter(e => e.event_type === 'subscription_cancelled').length
  const conversionRate  = trialsStarted > 0
    ? Math.round(((trialsStarted - trialsCancelled) / trialsStarted) * 100) : 0

  // ── Onboarding funnel ─────────────────────────────────────────
  const profiledUsers  = profiles.length                    // completed profile
  const plannedUsers   = planUserIds.size                   // generated a plan
  const onboardingRate = totalUsers > 0 ? Math.round((profiledUsers / totalUsers) * 100) : 0
  const planRate       = totalUsers > 0 ? Math.round((plannedUsers  / totalUsers) * 100) : 0

  // ── Growth ────────────────────────────────────────────────────
  const newThisWeek  = authUsers.filter(u => u.created_at > weekAgo).length
  const newThisMonth = authUsers.filter(u => u.created_at > monthAgo).length

  // ── Today activity ────────────────────────────────────────────
  const todayRows    = msgUsage.filter(r => r.date === today)
  const todayChatRows = chatRows.filter(r => r.created_at?.slice(0, 10) === today)
  const todayMsgs    = todayChatRows.length || todayRows.reduce((s, r) => s + (r.count || 0), 0)
  const activeToday  = new Set(todayChatRows.map(r => r.user_id)).size || todayRows.length

  // ── Retention (sent message in last 7 / 30 days) ─────────────
  const active7d  = new Set(chatRows.filter(r => r.created_at >= weekAgo).map(r => r.user_id)).size
    || new Set(msgUsage.filter(r => r.date >= weekAgo.slice(0, 10)).map(r => r.user_id)).size
  const active30d = new Set(chatRows.filter(r => r.created_at >= monthAgo).map(r => r.user_id)).size
    || new Set(msgUsage.filter(r => r.date >= monthAgo.slice(0, 10)).map(r => r.user_id)).size

  const tokenUsers = Object.values(tokenByUser)
  const totalTokenCost = tokenUsers.reduce((sum, u) => sum + u.cost, 0)
  const monthTokenCost = tokenUsers.reduce((sum, u) => sum + u.monthCost, 0)
  const monthTokenTotal = tokenUsers.reduce((sum, u) => sum + u.monthTotal, 0)
  const monthTokenMessages = tokenUsers.reduce((sum, u) => sum + u.monthMessages, 0)
  const avgCostPerMessage = monthTokenMessages > 0 ? monthTokenCost / monthTokenMessages : 0
  const monthWindowDays = Math.max(1, Math.ceil((Date.now() - new Date(monthAgo).getTime()) / 86400000))
  const projectedMonthlyCost = monthTokenCost > 0 ? monthTokenCost * (30 / monthWindowDays) : 0

  // ── Users with no plan (churn risk) ──────────────────────────
  const noPlanUsers = authUsers.filter(u => !planUserIds.has(u.id))

  // ── Plan distribution ─────────────────────────────────────────
  const starterCount = Math.max(0, totalUsers - activeSubs.length - trialSubs.length - cancelledSubs.length)
  const planDistribution = [
    { label: 'Elite',     count: eliteSubs.length,   color: '#D88BFF' },
    { label: 'Pro',       count: proSubs.length,      color: '#BB5CF6' },
    { label: 'Trial',     count: trialSubs.length,    color: '#F59E0B' },
    { label: 'Starter',   count: starterCount,        color: '#334155' },
    { label: 'Cancelled', count: cancelledSubs.length, color: '#EF4444' },
  ]
  const totalForPie = planDistribution.reduce((s, p) => s + p.count, 0) || 1

  const funnelSteps = [
    { label: 'Signed Up',          count: totalUsers,     color: '#BB5CF6' },
    { label: 'Completed Profile',  count: profiledUsers,  color: '#3B82F6' },
    { label: 'Generated a Plan',   count: plannedUsers,   color: '#F59E0B' },
    { label: 'Converted to Paid',  count: activeSubs.length, color: '#10B981' },
    { label: 'Upgraded to Elite',  count: eliteSubs.length,  color: '#D88BFF' },
  ]

  const planBreakdown: Record<string, number> = {}
  for (const s of activeSubs) {
    const tier = getPlanTier(s)
    const key  = `${tier} (${s.billing_period || 'monthly'})`
    planBreakdown[key] = (planBreakdown[key] || 0) + 1
  }

  const launchMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>ADMINISTRATION</p>
          <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>SYNAP Admin</h1>
          <p className="font-heading text-xs mt-1" style={{ color: '#475569' }}>
            Last refreshed: {new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExternalLink href="https://app.lemonsqueezy.com"     label="Lemon Squeezy" />
          <ExternalLink href="https://supabase.com/dashboard"   label="Supabase" />
          <ExternalLink href="https://vercel.com/dashboard"     label="Vercel" />
        </div>
      </div>

      {/* Launch mode banner */}
      {launchMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Zap size={14} style={{ color: '#10B981' }} />
          <p className="font-heading text-xs font-semibold" style={{ color: '#10B981' }}>
            LAUNCH MODE ON — all features free, payment system bypassed. No charges being collected.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { href: '#overview', label: 'Overview' },
          { href: '#token-costs', label: 'Token Costs' },
          { href: '#users', label: 'Users' },
          { href: '#billing', label: 'Billing' },
        ].map(tab => (
          <a key={tab.href} href={tab.href}
            className="px-3 py-2 rounded-lg font-heading text-xs font-bold tracking-wider whitespace-nowrap"
            style={{ background: tab.href === '#token-costs' ? 'rgba(187,92,246,0.16)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: tab.href === '#token-costs' ? '#D88BFF' : '#64748B' }}>
            {tab.label}
          </a>
        ))}
      </div>

      {/* ── Row 1: Key metrics ─────────────────────────────────── */}
      <div id="overview" className="grid grid-cols-2 sm:grid-cols-4 gap-3 scroll-mt-4">
        <StatCard label="Total Users"   value={totalUsers}
          sub={`+${newThisWeek} this week · +${newThisMonth} this month`}
          icon={Users} color="#BB5CF6" />
        <StatCard label="MRR"           value={`SAR ${mrr.toFixed(0)}`}
          sub={`ARR SAR ${arr.toFixed(0)} · ARPU SAR ${arpu.toFixed(0)}`}
          icon={DollarSign} color="#10B981" />
        <StatCard label="Elite / Pro"   value={`${eliteSubs.length} / ${proSubs.length}`}
          sub={`${trialSubs.length} in trial · ${conversionRate}% conv.`}
          icon={Crown} color="#D88BFF" />
        <StatCard label="Today"         value={`${todayMsgs} msgs`}
          sub={`${activeToday} active users`}
          icon={Activity} color="#3B82F6" />
      </div>

      {/* ── Row 2: Engagement & onboarding ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Chats"     value={chatCountRes.count ?? 0}
          sub="user + assistant msgs"
          icon={MessageCircle} color="#D88BFF" />
        <StatCard label="Workouts Logged" value={workoutLogCountRes.count ?? 0}
          sub="all time"
          icon={Dumbbell} color="#BB5CF6" />
        <StatCard label="Has a Plan"      value={`${plannedUsers} (${planRate}%)`}
          sub={`${noPlanUsers.length} still need onboarding`}
          icon={CheckCircle2} color="#10B981" />
        <StatCard label="Retention 7d/30d" value={`${active7d} / ${active30d}`}
          sub="users active in last 7 / 30 days"
          icon={TrendingUp} color="#F59E0B" />
      </div>

      <div id="token-costs" className="glass-card overflow-hidden scroll-mt-4">
        <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div>
            <SectionTitle>TOKEN COSTS</SectionTitle>
            <p className="font-heading text-[10px] -mt-2" style={{ color: '#475569' }}>
              Based on ai_usage_log rows. Older AI calls before this update may show zero tokens.
            </p>
            {tokenLogError && (
              <p className="font-heading text-[10px] mt-2" style={{ color: '#F59E0B' }}>
                Token table not ready: run supabase-ai-usage.sql in Supabase.
              </p>
            )}
          </div>
          <p className="font-heading text-[10px]" style={{ color: '#334155' }}>
            Pricing: ${TOKEN_PRICING.inputPerMTok}/MTok input · ${TOKEN_PRICING.outputPerMTok}/MTok output
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <StatCard label="30d Token Cost" value={formatUsd(monthTokenCost)}
            sub={`${monthTokenTotal.toLocaleString()} tokens tracked`}
            icon={DollarSign} color="#10B981" />
          <StatCard label="Projected Monthly" value={formatUsd(projectedMonthlyCost)}
            sub="run-rate from tracked usage"
            icon={TrendingUp} color="#F59E0B" />
          <StatCard label="Avg Cost / Msg" value={formatUsd(avgCostPerMessage)}
            sub={`${monthTokenMessages} assistant replies`}
            icon={MessageCircle} color="#D88BFF" />
          <StatCard label="All-Time AI Cost" value={formatUsd(totalTokenCost)}
            sub={`${tokenRows.length} tracked rows`}
            icon={BarChart3} color="#3B82F6" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['USER', 'MESSAGES', '30D TOKENS', '30D COST', 'ALL TOKENS', 'ALL COST', 'AVG / MSG', 'LAST AI USE'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-heading text-[10px] tracking-widest whitespace-nowrap" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...authUsers]
                .map(u => ({ user: u, usage: tokenByUser[u.id] }))
                .sort((a, b) => (b.usage?.monthCost || 0) - (a.usage?.monthCost || 0))
                .map(({ user: u, usage }) => {
                  const profile = profiles.find(p => p.user_id === u.id)
                  const avg = usage?.monthMessages ? usage.monthCost / usage.monthMessages : 0
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-heading text-xs text-white truncate">{profile?.name || u.email}</p>
                        <p className="font-heading text-[10px] truncate" style={{ color: '#334155' }}>{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-heading text-xs text-white">{usage?.monthMessages || 0} / {usage?.messages || 0}</p>
                        <p className="font-heading text-[10px]" style={{ color: '#334155' }}>30d / all</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs" style={{ color: '#E2E8F0' }}>{(usage?.monthTotal || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-heading text-xs font-bold" style={{ color: (usage?.monthCost || 0) > 0 ? '#10B981' : '#334155' }}>{formatUsd(usage?.monthCost || 0)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs" style={{ color: '#94A3B8' }}>{(usage?.total || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-heading text-xs" style={{ color: '#94A3B8' }}>{formatUsd(usage?.cost || 0)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-heading text-xs" style={{ color: avg > 0 ? '#D88BFF' : '#334155' }}>{formatUsd(avg)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-heading text-xs whitespace-nowrap" style={{ color: usage?.lastDate ? '#64748B' : '#334155' }}>{usage?.lastDate || 'No token data'}</p>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Funnel + Distribution ─────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">

        {/* Upgrade funnel */}
        <div className="glass-card p-5">
          <SectionTitle>FULL FUNNEL</SectionTitle>
          <div className="flex flex-col gap-4">
            {funnelSteps.map((step, i) => {
              const pct  = funnelSteps[0].count > 0 ? Math.round((step.count / funnelSteps[0].count) * 100) : 0
              const barW = pct
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-[10px] font-bold w-4 text-center" style={{ color: step.color }}>{i + 1}</span>
                      <span className="font-heading text-xs text-white">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-white">{step.count}</span>
                      <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${barW}%`, background: step.color }} />
                  </div>
                  {i < funnelSteps.length - 1 && step.count > 0 && (
                    <p className="font-heading text-[10px] text-right mt-0.5" style={{ color: '#334155' }}>
                      {Math.round((funnelSteps[i + 1].count / step.count) * 100)}% proceed →
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="glass-card p-5">
          <SectionTitle>PLAN DISTRIBUTION</SectionTitle>
          <div className="flex flex-col gap-3">
            {planDistribution.map(p => {
              const pct = Math.round((p.count / totalForPie) * 100)
              return (
                <div key={p.label}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="font-heading text-xs text-white">{p.label}</span>
                    </div>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{p.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Bar chart */}
          <div className="mt-5 flex items-end gap-1 h-20">
            {planDistribution.filter(p => p.count > 0).map((p, i) => {
              const max = Math.max(...planDistribution.map(x => x.count), 1)
              const h   = Math.round((p.count / max) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-heading text-[9px] font-bold" style={{ color: p.color }}>{p.count}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: `${p.color}60`, border: `1px solid ${p.color}40`, minHeight: 4 }} />
                  <span className="font-heading text-[8px]" style={{ color: '#475569' }}>{p.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Revenue + Sub status ──────────────────────────────────── */}
      <div id="billing" className="grid sm:grid-cols-2 gap-5 scroll-mt-4">

        <div className="glass-card p-5">
          <SectionTitle>REVENUE METRICS</SectionTitle>
          <div className="flex flex-col gap-3">
            <RevenueRow label="Monthly Recurring Revenue" value={`SAR ${mrr.toFixed(2)}`}   color="#10B981" />
            <RevenueRow label="Annual Recurring Revenue"  value={`SAR ${arr.toFixed(2)}`}   color="#10B981" />
            <RevenueRow label="Avg Revenue Per User"      value={`SAR ${arpu.toFixed(2)}`}  color="#10B981" />
            <RevenueRow label="Trial Conversion Rate"     value={`${conversionRate}%`}       color={conversionRate >= 50 ? '#10B981' : '#F59E0B'} />
            <RevenueRow label="Trials Started (recent)"  value={String(trialsStarted)}      color="#BB5CF6" />
            <RevenueRow label="Trial Cancellations"       value={String(trialsCancelled)}    color="#EF4444" />
          </div>
        </div>

        <div className="glass-card p-5">
          <SectionTitle>SUBSCRIPTION STATUS</SectionTitle>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Active (paid)',       count: activeSubs.length,                 color: '#10B981' },
              { label: 'In Trial',            count: trialSubs.length,                  color: '#BB5CF6' },
              { label: 'Cancelled / Expired', count: cancelledSubs.length,              color: '#EF4444' },
              { label: 'Free (no sub)',       count: Math.max(0, totalUsers - activeSubs.length - trialSubs.length - cancelledSubs.length), color: '#475569' },
            ].map(({ label, count, color }) => {
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-heading text-xs text-white">{label}</span>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Onboarding health ─────────────────────────────────────── */}
      {noPlanUsers.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={14} style={{ color: '#F59E0B' }} />
            <SectionTitle>NEEDS ONBOARDING ({noPlanUsers.length} users)</SectionTitle>
          </div>
          <p className="font-heading text-xs mb-3" style={{ color: '#64748B' }}>
            These users signed up but have not generated a plan yet — highest churn risk.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['EMAIL', 'JOINED', 'DAYS AGO', 'MSGS SENT'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {noPlanUsers.slice(0, 15).map(u => {
                  const daysAgo = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000)
                  const msgs    = chatByUser[u.id]?.userMessages || msgByUser[u.id]?.total || 0
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-3 py-2.5">
                        <p className="font-heading text-xs" style={{ color: '#F59E0B' }}>{u.email}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-heading text-xs" style={{ color: '#475569' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-heading text-xs px-2 py-0.5 rounded-full"
                          style={{ background: daysAgo > 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: daysAgo > 3 ? '#EF4444' : '#F59E0B' }}>
                          {daysAgo}d
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-heading text-xs" style={{ color: msgs > 0 ? '#10B981' : '#334155' }}>{msgs}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {noPlanUsers.length > 15 && (
              <p className="font-heading text-[10px] px-3 pt-2" style={{ color: '#334155' }}>+{noPlanUsers.length - 15} more…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Active plan breakdown ─────────────────────────────────── */}
      {Object.keys(planBreakdown).length > 0 && (
        <div className="glass-card p-5">
          <SectionTitle>ACTIVE PLAN BREAKDOWN</SectionTitle>
          <div className="flex flex-col gap-3">
            {Object.entries(planBreakdown).map(([key, count]) => {
              const pct = activeSubs.length > 0 ? Math.round((count / activeSubs.length) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="font-heading text-xs text-white capitalize">{key}</span>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#BB5CF6' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Billing events ───────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <SectionTitle>RECENT BILLING EVENTS</SectionTitle>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
            {events.map((e, i) => {
              const ev = EVENT_LABELS[e.event_type] || { label: e.event_type, color: '#64748B' }
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                    <span className="font-heading text-xs text-white">{ev.label}</span>
                    {e.metadata?.email && (
                      <span className="font-heading text-xs truncate" style={{ color: '#475569' }}>{e.metadata.email}</span>
                    )}
                  </div>
                  <span className="font-heading text-[10px] flex-shrink-0 ml-3" style={{ color: '#334155' }}>
                    {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All users table ──────────────────────────────────────── */}
      <div id="users" className="glass-card overflow-hidden scroll-mt-4">
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <SectionTitle>ALL USERS ({totalUsers})</SectionTitle>
          <p className="font-heading text-[10px]" style={{ color: '#334155' }}>Sorted newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['EMAIL', 'NAME', 'GOAL', 'PLAN', 'HAS PLAN', 'MSGS', 'LAST ACTIVE', 'JOINED'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-heading text-[10px] tracking-widest whitespace-nowrap" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...authUsers].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(u => {
                const profile    = profiles.find(p => p.user_id === u.id)
                const sub        = subs.find(s => s.user_id === u.id)
                const hasPlan    = planUserIds.has(u.id)
                const usage      = msgByUser[u.id]
                const chatUsage  = chatByUser[u.id]
                const totalMsgs  = chatUsage?.userMessages || usage?.total || 0
                const lastActive = chatUsage?.lastDate || usage?.lastDate || null
                const daysInactive = lastActive
                  ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
                  : null

                const tier = sub ? getPlanTier(sub) : 'starter'
                const planDisplay = sub?.status === 'trial'     ? 'Trial'
                  : sub?.status === 'active'                    ? (tier === 'elite' ? 'Elite' : tier === 'pro' ? 'Pro' : 'Starter')
                  : sub?.status === 'cancelled'                 ? 'Cancelled'
                  : 'Starter'
                const planColor = planDisplay === 'Elite'    ? '#D88BFF'
                  : planDisplay === 'Trial'                   ? '#F59E0B'
                  : planDisplay === 'Pro'                     ? '#10B981'
                  : planDisplay === 'Cancelled'               ? '#EF4444' : '#475569'

                return (
                  <tr key={u.id} className="hover:bg-white/[0.015] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-heading text-xs text-white truncate">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs whitespace-nowrap" style={{ color: '#94A3B8' }}>{profile?.name || <span style={{ color: '#2D3748' }}>—</span>}</p>
                    </td>
                    <td className="px-4 py-3">
                      {profile?.goal ? (
                        <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                          {GOAL_LABELS[profile.goal] || profile.goal}
                        </span>
                      ) : <span style={{ color: '#2D3748' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: `${planColor}18`, color: planColor }}>
                        {planDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasPlan
                        ? <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                        : <XCircle      size={14} style={{ color: '#334155' }} />}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs" style={{ color: totalMsgs > 0 ? '#E2E8F0' : '#334155' }}>{totalMsgs}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lastActive ? (
                        <span className="font-heading text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 w-fit"
                          style={{
                            background: daysInactive === 0 ? 'rgba(16,185,129,0.1)' : daysInactive! <= 7 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                            color: daysInactive === 0 ? '#10B981' : daysInactive! <= 7 ? '#F59E0B' : '#475569',
                          }}>
                          <Clock size={9} />
                          {daysInactive === 0 ? 'Today' : `${daysInactive}d ago`}
                        </span>
                      ) : <span style={{ color: '#2D3748' }} className="font-heading text-xs">Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs whitespace-nowrap" style={{ color: '#475569' }}>
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Goal + Gender breakdown ───────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">

        <div className="glass-card p-5">
          <SectionTitle>GOAL BREAKDOWN</SectionTitle>
          <div className="flex flex-col gap-3">
            {Object.entries(GOAL_LABELS).map(([key, label]) => {
              const count = profiles.filter(p => p.goal === key).length
              const pct   = profiles.length > 0 ? (count / profiles.length) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="font-heading text-xs text-white">{label}</span>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#10B981' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <SectionTitle>GENDER SPLIT</SectionTitle>
          <div className="flex flex-col gap-3">
            {['male', 'female'].map(g => {
              const count = profiles.filter(p => p.gender === g).length
              const pct   = profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
              return (
                <div key={g}>
                  <div className="flex justify-between mb-1">
                    <span className="font-heading text-xs text-white capitalize">{g}</span>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: g === 'male' ? '#3B82F6' : '#EC4899' }} />
                  </div>
                </div>
              )
            })}
            <p className="font-heading text-[10px] mt-1" style={{ color: '#334155' }}>
              {profiles.length - profiles.filter(p => p.gender === 'male' || p.gender === 'female').length} not set
            </p>
          </div>
        </div>
      </div>

      <p className="font-heading text-[10px] text-center pb-4" style={{ color: '#1E293B' }}>
        SYNAP Admin · data via Supabase service role · all times UTC
      </p>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-black text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.06em' }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }} />
        <span className="font-heading text-[10px] tracking-wider" style={{ color: '#475569' }}>{label}</span>
      </div>
      <span className="font-heading font-black text-xl text-white">{value}</span>
      {sub && <span className="font-heading text-[10px] leading-relaxed" style={{ color: '#334155' }}>{sub}</span>}
    </div>
  )
}

function RevenueRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span className="font-heading text-xs" style={{ color: '#64748B' }}>{label}</span>
      <span className="font-heading font-bold text-sm" style={{ color }}>{value}</span>
    </div>
  )
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-heading text-xs font-semibold transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748B' }}>
      <ExternalLinkIcon size={10} />
      {label}
    </a>
  )
}
