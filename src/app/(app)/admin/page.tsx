import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Dumbbell, UtensilsCrossed, MessageCircle, TrendingUp,
  DollarSign, Crown, BarChart3, AlertCircle, ArrowUpRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// SAR prices by plan+billing
const PLAN_PRICES: Record<string, number> = {
  'pro-monthly':       34.99,
  'pro-annual':       289.99,
  'unlimited-monthly': 44.99,
  'unlimited-annual': 369.99,
}

function annualPrice(p: number, billing: string) {
  return billing === 'annual' ? p : p * 12
}

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminEmail = process.env.ADMIN_EMAIL
  if (user.email !== adminEmail) redirect('/dashboard')

  // ── Fetch all data ────────────────────────────────────────
  const [
    usersRes, profilesRes, workoutPlansRes, dietPlansRes, chatRes, logsRes,
    subsRes, billingEventsRes,
  ] = await Promise.all([
    supabase.from('users').select('id, email, created_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('user_id, name, goal, created_at').order('created_at', { ascending: false }),
    supabase.from('workout_plans').select('id', { count: 'exact' }).eq('active', true),
    supabase.from('diet_plans').select('id', { count: 'exact' }).eq('active', true),
    supabase.from('chat_messages').select('id', { count: 'exact' }),
    supabase.from('workout_log').select('id', { count: 'exact' }),
    supabase.from('subscriptions').select('*'),
    supabase.from('billing_events').select('event_type, created_at').order('created_at', { ascending: false }).limit(100),
  ])

  const users = usersRes.data || []
  const profiles = profilesRes.data || []
  const subscriptions = subsRes.data || []
  const billingEvents = billingEventsRes.data || []

  // ── Revenue calculations ──────────────────────────────────
  const activeSubs = subscriptions.filter(s => s.status === 'active')
  const trialSubs  = subscriptions.filter(s => s.status === 'trial')
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'expired')
  const freeSubs   = subscriptions.filter(s => !s.status || s.status === 'free')

  // MRR: sum of monthly equivalent of active subscriptions
  let mrr = 0
  for (const s of activeSubs) {
    const key = `${s.plan_name}-${s.billing_period}`
    const price = PLAN_PRICES[key]
    if (price) {
      mrr += s.billing_period === 'annual' ? price / 12 : price
    }
  }
  const arr = mrr * 12

  // Trial-to-paid conversion (cancelled trials vs total trials ever started)
  const trialStartedEvents = billingEvents.filter(e => e.event_type === 'subscription_created').length
  const trialCancelledEvents = billingEvents.filter(e => e.event_type === 'subscription_cancelled').length
  const conversionRate = trialStartedEvents > 0
    ? Math.round(((trialStartedEvents - trialCancelledEvents) / trialStartedEvents) * 100)
    : 0

  // Plan breakdown
  const planBreakdown: Record<string, number> = {}
  for (const s of activeSubs) {
    const key = `${s.plan_name} (${s.billing_period})`
    planBreakdown[key] = (planBreakdown[key] || 0) + 1
  }

  // New users this week
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const newUsersThisWeek = users.filter(u => new Date(u.created_at) > weekAgo).length

  const goalLabels: Record<string, string> = {
    lose_fat: 'Lose Fat', build_muscle: 'Build Muscle',
    recomposition: 'Recomp', improve_fitness: 'Fitness', be_healthier: 'Health',
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-6xl mx-auto">

      <div className="mb-8">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>ADMINISTRATION</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>SYNAP Admin</h1>
      </div>

      {/* ── Top stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Users" value={users.length} sub={`+${newUsersThisWeek} this week`} icon={Users} color="#BB5CF6" />
        <StatCard label="MRR" value={`SAR ${mrr.toFixed(0)}`} sub={`ARR: SAR ${arr.toFixed(0)}`} icon={DollarSign} color="#10B981" />
        <StatCard label="Active Subs" value={activeSubs.length} sub={`${trialSubs.length} in trial`} icon={Crown} color="#F59E0B" />
        <StatCard label="Chat Messages" value={chatRes.count || 0} sub={`${logsRes.count || 0} workouts logged`} icon={MessageCircle} color="#3B82F6" />
      </div>

      {/* ── Revenue overview ─────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5 mb-8">

        {/* Subscription status breakdown */}
        <div className="glass-card p-5">
          <p className="font-heading font-black text-sm text-white mb-5 tracking-wider" style={{ letterSpacing: '0.06em' }}>SUBSCRIPTION STATUS</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Active', count: activeSubs.length, color: '#10B981' },
              { label: 'In Trial', count: trialSubs.length, color: '#BB5CF6' },
              { label: 'Cancelled / Expired', count: cancelledSubs.length, color: '#EF4444' },
              { label: 'Free', count: freeSubs.length + (users.length - subscriptions.length), color: '#475569' },
            ].map(({ label, count, color }) => {
              const total = users.length || 1
              const pct = Math.round((count / total) * 100)
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

        {/* Revenue metrics */}
        <div className="glass-card p-5">
          <p className="font-heading font-black text-sm text-white mb-5 tracking-wider" style={{ letterSpacing: '0.06em' }}>REVENUE METRICS</p>
          <div className="flex flex-col gap-4">
            <RevenueRow label="Monthly Recurring Revenue" value={`SAR ${mrr.toFixed(2)}`} color="#10B981" />
            <RevenueRow label="Annual Recurring Revenue" value={`SAR ${arr.toFixed(2)}`} color="#10B981" />
            <RevenueRow label="Trial Conversion Rate" value={`${conversionRate}%`} color={conversionRate >= 50 ? '#10B981' : '#F59E0B'} />
            <RevenueRow label="Trials Started" value={String(trialStartedEvents)} color="#BB5CF6" />
            <RevenueRow label="Trial Cancellations" value={String(trialCancelledEvents)} color="#EF4444" />
          </div>
        </div>
      </div>

      {/* ── Active plan breakdown ─────────────────────────────── */}
      {activeSubs.length > 0 && (
        <div className="glass-card p-5 mb-8">
          <p className="font-heading font-black text-sm text-white mb-5 tracking-wider" style={{ letterSpacing: '0.06em' }}>ACTIVE PLAN BREAKDOWN</p>
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

      {/* ── Users table ──────────────────────────────────────── */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
            ALL USERS ({users.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>EMAIL</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>NAME</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>GOAL</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>PLAN</th>
                <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const profile = profiles.find(p => p.user_id === u.id)
                const sub = subscriptions.find(s => s.user_id === u.id)
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
                        <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                          {goalLabels[profile.goal] || profile.goal}
                        </span>
                      ) : <span style={{ color: '#2D3748' }}>—</span>}
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

      {/* ── Goal breakdown ────────────────────────────────────── */}
      <div className="glass-card p-5">
        <p className="font-heading font-black text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.06em' }}>GOAL BREAKDOWN</p>
        <div className="flex flex-col gap-3">
          {Object.entries(goalLabels).map(([key, label]) => {
            const count = profiles.filter(p => p.goal === key).length
            const pct = profiles.length > 0 ? (count / profiles.length) * 100 : 0
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="font-heading text-xs text-white">{label}</span>
                  <span className="font-heading text-xs" style={{ color: '#475569' }}>{count} ({Math.round(pct)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#BB5CF6' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

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
      {sub && <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{sub}</span>}
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
