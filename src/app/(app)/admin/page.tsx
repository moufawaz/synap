import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import {
  Users, MessageCircle, Crown, DollarSign,
  TrendingUp, Zap, Activity, ExternalLink as ExternalLinkIcon,
  XCircle, BarChart3,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLAN_PRICES: Record<string, number> = {
  'pro-monthly':        34.99,
  'pro-annual':        289.99,
  'unlimited-monthly':  44.99,
  'unlimited-annual':  369.99,
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  subscription_created:         { label: 'Trial started',      color: '#BB5CF6' },
  subscription_updated:         { label: 'Sub updated',        color: '#3B82F6' },
  subscription_cancelled:       { label: 'Cancelled',          color: '#EF4444' },
  subscription_resumed:         { label: 'Resumed',            color: '#10B981' },
  subscription_expired:         { label: 'Expired',            color: '#F59E0B' },
  subscription_payment_success: { label: 'Payment received',   color: '#10B981' },
  subscription_payment_failed:  { label: 'Payment failed',     color: '#EF4444' },
  order_created:                { label: 'Add-on purchased',   color: '#22D3EE' },
}

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose Fat', build_muscle: 'Build Muscle',
  recomposition: 'Recomp', improve_fitness: 'Fitness', be_healthier: 'Health',
}

export default async function AdminPage() {
  // ── Auth + admin gate ─────────────────────────────────────
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // ── Service-role client for auth.admin.listUsers() ────────
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ── Fetch all data in parallel ────────────────────────────
  const [
    authUsersRes,
    profilesRes,
    subsRes,
    billingEventsRes,
    chatCountRes,
    workoutLogRes,
    todayMsgRes,
    activeUsersRes,
  ] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('profiles').select('user_id, name, goal, gender, created_at'),
    supabase.from('subscriptions').select('*'),
    supabase.from('billing_events')
      .select('event_type, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
    supabase.from('workout_log').select('id', { count: 'exact', head: true }),
    supabase.from('message_usage')
      .select('count')
      .eq('date', new Date().toISOString().slice(0, 10)),
    supabase.from('message_usage')
      .select('user_id', { count: 'exact', head: true })
      .eq('date', new Date().toISOString().slice(0, 10)),
  ])

  const authUsers  = authUsersRes.data?.users || []
  const profiles   = profilesRes.data || []
  const subs       = subsRes.data || []
  const events     = billingEventsRes.data || []

  // ── Subscription buckets ──────────────────────────────────
  const activeSubs    = subs.filter(s => s.status === 'active')
  const trialSubs     = subs.filter(s => s.status === 'trial')
  const cancelledSubs = subs.filter(s => s.status === 'cancelled' || s.status === 'expired')
  const freeSubs      = subs.filter(s => !s.status || s.status === 'free')
  const totalUsers    = authUsers.length

  // ── Revenue ───────────────────────────────────────────────
  let mrr = 0
  for (const s of activeSubs) {
    const key = `${s.plan_name}-${s.billing_period}`
    const price = PLAN_PRICES[key]
    if (price) mrr += s.billing_period === 'annual' ? price / 12 : price
  }
  const arr = mrr * 12
  const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0

  // ── Conversion ────────────────────────────────────────────
  const trialsStarted   = events.filter(e => e.event_type === 'subscription_created').length
  const trialsCancelled = events.filter(e => e.event_type === 'subscription_cancelled').length
  const conversionRate  = trialsStarted > 0
    ? Math.round(((trialsStarted - trialsCancelled) / trialsStarted) * 100) : 0

  // ── Plan breakdown ────────────────────────────────────────
  const planBreakdown: Record<string, number> = {}
  for (const s of activeSubs) {
    const key = `${s.plan_name} (${s.billing_period})`
    planBreakdown[key] = (planBreakdown[key] || 0) + 1
  }

  // ── Growth ────────────────────────────────────────────────
  const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const newThisWeek  = authUsers.filter(u => u.created_at > weekAgo).length
  const newThisMonth = authUsers.filter(u => u.created_at > monthAgo).length

  // ── Today's activity ──────────────────────────────────────
  const todayMsgs = (todayMsgRes.data || []).reduce((sum: number, r: any) => sum + (r.count || 0), 0)
  const activeToday = activeUsersRes.count || 0

  // ── Launch mode ───────────────────────────────────────────
  const launchMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>ADMINISTRATION</p>
          <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>SYNAP Admin</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <ExternalLink href="https://app.lemonsqueezy.com" label="Lemon Squeezy" />
          <ExternalLink href="https://supabase.com/dashboard" label="Supabase" />
          <ExternalLink href="https://vercel.com/dashboard" label="Vercel" />
        </div>
      </div>

      {/* ── Launch Mode banner ──────────────────────────────── */}
      {launchMode && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Zap size={14} style={{ color: '#10B981' }} />
          <p className="font-heading text-xs font-semibold" style={{ color: '#10B981' }}>
            LAUNCH MODE is ON — all features free, payment system bypassed. Payments will not be collected.
          </p>
        </div>
      )}

      {/* ── Top KPIs ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users"     value={totalUsers}            sub={`+${newThisWeek} this week · +${newThisMonth} this month`} icon={Users}         color="#BB5CF6" />
        <StatCard label="MRR"             value={`SAR ${mrr.toFixed(0)}`} sub={`ARR: SAR ${arr.toFixed(0)} · ARPU: SAR ${arpu.toFixed(0)}`} icon={DollarSign}   color="#10B981" />
        <StatCard label="Paid / Trial"    value={`${activeSubs.length} / ${trialSubs.length}`} sub={`Conversion: ${conversionRate}%`} icon={Crown}  color="#F59E0B" />
        <StatCard label="Today"           value={`${todayMsgs} msgs`}   sub={`${activeToday} active users`}                           icon={Activity}      color="#3B82F6" />
      </div>

      {/* ── Second row KPIs ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Chats"     value={chatCountRes.count || 0}   sub="all time"            icon={MessageCircle} color="#A78BFA" />
        <StatCard label="Workouts Logged" value={workoutLogRes.count || 0}  sub="all time"            icon={TrendingUp}    color="#22D3EE" />
        <StatCard label="Cancelled"       value={cancelledSubs.length}       sub="total cancelled"     icon={XCircle}       color="#EF4444" />
        <StatCard label="Free Users"      value={totalUsers - activeSubs.length - trialSubs.length} sub="no subscription" icon={BarChart3} color="#475569" />
      </div>

      {/* ── Revenue + Status side by side ───────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">

        <div className="glass-card p-5">
          <SectionTitle>REVENUE METRICS</SectionTitle>
          <div className="flex flex-col gap-3">
            <RevenueRow label="Monthly Recurring Revenue" value={`SAR ${mrr.toFixed(2)}`}  color="#10B981" />
            <RevenueRow label="Annual Recurring Revenue"  value={`SAR ${arr.toFixed(2)}`}  color="#10B981" />
            <RevenueRow label="Avg Revenue Per User"      value={`SAR ${arpu.toFixed(2)}`} color="#10B981" />
            <RevenueRow label="Trial Conversion Rate"     value={`${conversionRate}%`}      color={conversionRate >= 50 ? '#10B981' : '#F59E0B'} />
            <RevenueRow label="Trials Started (recent)"  value={String(trialsStarted)}     color="#BB5CF6" />
            <RevenueRow label="Trial Cancellations"       value={String(trialsCancelled)}   color="#EF4444" />
          </div>
        </div>

        <div className="glass-card p-5">
          <SectionTitle>SUBSCRIPTION STATUS</SectionTitle>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Active (paid)',        count: activeSubs.length,    color: '#10B981' },
              { label: 'In Trial',             count: trialSubs.length,     color: '#BB5CF6' },
              { label: 'Cancelled / Expired',  count: cancelledSubs.length, color: '#EF4444' },
              { label: 'Free (no sub)',        count: Math.max(0, totalUsers - activeSubs.length - trialSubs.length - cancelledSubs.length), color: '#475569' },
            ].map(({ label, count, color }) => {
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-heading text-xs text-white">{label}</span>
                    <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Plan breakdown ──────────────────────────────────── */}
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

      {/* ── Recent billing events ───────────────────────────── */}
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
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                    <span className="font-heading text-xs text-white">{ev.label}</span>
                    {e.metadata?.email && (
                      <span className="font-heading text-xs" style={{ color: '#475569' }}>{e.metadata.email}</span>
                    )}
                  </div>
                  <span className="font-heading text-[10px]" style={{ color: '#334155' }}>
                    {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Users table ─────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <SectionTitle>ALL USERS ({totalUsers})</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['EMAIL', 'NAME', 'GOAL', 'GENDER', 'PLAN', 'JOINED'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {authUsers.map(u => {
                const profile = profiles.find(p => p.user_id === u.id)
                const sub = subs.find(s => s.user_id === u.id)
                const planDisplay = sub?.status === 'trial' ? 'Trial'
                  : sub?.status === 'active' ? (sub.plan_name === 'unlimited' ? 'Unlimited' : 'Pro')
                  : 'Free'
                const planColor = planDisplay === 'Trial' ? '#BB5CF6'
                  : planDisplay === 'Unlimited' ? '#22D3EE'
                  : planDisplay === 'Pro' ? '#10B981' : '#475569'

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs text-white">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs" style={{ color: '#94A3B8' }}>{profile?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {profile?.goal ? (
                        <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                          {GOAL_LABELS[profile.goal] || profile.goal}
                        </span>
                      ) : <span style={{ color: '#2D3748' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs capitalize" style={{ color: '#64748B' }}>
                        {profile?.gender || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${planColor}18`, color: planColor }}>
                        {planDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-heading text-xs" style={{ color: '#475569' }}>
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

      {/* ── Goal breakdown ──────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <SectionTitle>GOAL BREAKDOWN</SectionTitle>
          <div className="flex flex-col gap-3">
            {Object.entries(GOAL_LABELS).map(([key, label]) => {
              const count = profiles.filter(p => p.goal === key).length
              const pct = profiles.length > 0 ? (count / profiles.length) * 100 : 0
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
              const pct = profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0
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

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

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
      {sub && <span className="font-heading text-[10px]" style={{ color: '#334155' }}>{sub}</span>}
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
