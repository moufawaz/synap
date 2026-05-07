'use client'

import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Minus, Sparkles, Flame, Target, Lock } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CHART_METRICS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', color: '#BB5CF6' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', color: '#F59E0B' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', color: '#10B981' },
  { key: 'bicep_right_cm', label: 'Bicep', unit: 'cm', color: '#BB5CF6' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', color: '#EF4444' },
]

export default function ProgressPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([])
  const [selectedMetric, setSelectedMetric] = useState('weight_kg')
  const [loading, setLoading] = useState(true)
  const [monthlySummary, setMonthlySummary] = useState<{ summary: string; stats: any } | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [planTier, setPlanTier] = useState<'starter' | 'pro' | 'elite' | 'trial'>('starter')
  const [goalTarget, setGoalTarget] = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [mRes, wRes] = await Promise.all([
      fetch('/api/measurements'),
      fetch('/api/log-workout'),
    ])
    const mData = await mRes.json()
    const wData = await wRes.json()
    setMeasurements((mData.measurements || []).reverse())
    setWorkoutLogs(wData.logs || [])

    // Fetch subscription tier + goal target
    if (user) {
      const [subRes, profileRes] = await Promise.all([
        supabase.from('subscriptions').select('plan_type, status, trial_ends_at, current_period_ends_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('goal_target').eq('user_id', user.id).single(),
      ])
      const sub = subRes.data
      const tier = deriveClientTier(sub)
      setPlanTier(tier)
      if (profileRes.data?.goal_target) {
        const parsed = parseFloat(profileRes.data.goal_target)
        if (!isNaN(parsed)) setGoalTarget(parsed)
      }
    }

    setLoading(false)
  }

  async function loadMonthlySummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/monthly-summary')
      const data = await res.json()
      setMonthlySummary(data)
    } catch (err) {
      console.error(err)
    }
    setSummaryLoading(false)
  }

  const metric = CHART_METRICS.find(m => m.key === selectedMetric)!
  const chartData = measurements
    .filter(m => m[selectedMetric] != null)
    .map(m => ({ date: m.date, value: m[selectedMetric] }))

  const firstVal = chartData[0]?.value
  const lastVal = chartData[chartData.length - 1]?.value
  const totalChange = firstVal != null && lastVal != null ? lastVal - firstVal : null

  const weeklyData = getWeeklyWorkouts(workoutLogs)
  const streakDays = getStreakDays(workoutLogs)
  const currentStreak = getStreak(workoutLogs)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>ANALYTICS</p>
        <h1 className="font-heading font-bold text-2xl text-white">Your Progress</h1>
      </div>

      {/* Summary cards */}
      {measurements.length >= 2 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {CHART_METRICS.slice(0, 3).map(m => {
            const vals = measurements.filter(x => x[m.key] != null)
            const first = vals[0]?.[m.key]
            const last = vals[vals.length - 1]?.[m.key]
            const change = first != null && last != null ? last - first : null
            const up = change != null && change > 0
            return (
              <div key={m.key} className="glass-card p-4">
                <p className="font-heading text-[10px] tracking-wider mb-2" style={{ color: '#475569' }}>{m.label}</p>
                <p className="font-heading font-bold text-lg text-white">
                  {last ?? '—'}<span className="text-xs font-normal ml-1" style={{ color: '#475569' }}>{m.unit}</span>
                </p>
                {change != null && (
                  <div className="flex items-center gap-1 mt-1">
                    {up ? <TrendingUp size={11} style={{ color: m.color }} /> : change < 0 ? <TrendingDown size={11} style={{ color: m.color }} /> : <Minus size={11} />}
                    <span className="font-heading text-xs font-semibold" style={{ color: m.color }}>
                      {up ? '+' : ''}{change.toFixed(1)}{m.unit}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Metric selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CHART_METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full font-heading text-xs font-semibold tracking-wider transition-all"
            style={{
              background: selectedMetric === m.key ? m.color + '20' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedMetric === m.key ? m.color + '60' : 'rgba(255,255,255,0.06)'}`,
              color: selectedMetric === m.key ? m.color : '#475569',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
            {metric.label} Over Time
          </p>
          {totalChange != null && (
            <div className="flex items-center gap-1">
              {totalChange < 0 ? <TrendingDown size={14} style={{ color: metric.color }} /> : <TrendingUp size={14} style={{ color: metric.color }} />}
              <span className="font-heading text-xs font-bold" style={{ color: metric.color }}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}{metric.unit}
              </span>
            </div>
          )}
        </div>
        {chartData.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-heading text-sm" style={{ color: '#475569' }}>Not enough data yet.</p>
            <p className="font-heading text-xs" style={{ color: '#2D3748' }}>Log measurements regularly to see your trend.</p>
          </div>
        ) : (
          <LineChart data={chartData} color={metric.color} unit={metric.unit} />
        )}
      </div>

      {/* Streak Calendar (12-week heatmap) */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: currentStreak > 0 ? '#F59E0B' : '#475569' }} />
            <p className="font-heading font-bold text-sm text-white">Workout Streak</p>
          </div>
          {currentStreak > 0 && (
            <span className="font-heading font-bold text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
              {currentStreak} day streak 🔥
            </span>
          )}
        </div>

        {/* Day labels */}
        <div className="flex gap-1 mb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="w-3 flex-shrink-0 text-center font-heading" style={{ fontSize: '8px', color: '#2D3748' }}>{d}</div>
          ))}
        </div>

        {/* 12-week grid */}
        <StreakCalendar activeDays={streakDays} />

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3">
          <span className="font-heading text-[10px]" style={{ color: '#475569' }}>Less</span>
          {[0, 0.3, 0.6, 1].map(o => (
            <div key={o} className="w-2.5 h-2.5 rounded-sm" style={{ background: o === 0 ? 'rgba(255,255,255,0.04)' : `rgba(187,92,246,${o})` }} />
          ))}
          <span className="font-heading text-[10px]" style={{ color: '#475569' }}>More</span>
        </div>
      </div>

      {/* Workout frequency bars */}
      <div className="glass-card p-5 mb-6">
        <p className="font-heading font-bold text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.06em' }}>
          Weekly Frequency
        </p>
        {weeklyData.length === 0 ? (
          <p className="font-heading text-sm text-center py-4" style={{ color: '#475569' }}>No workouts logged yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-24">
            {weeklyData.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-heading text-xs font-bold" style={{ color: '#BB5CF6' }}>{week.count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((week.count / 7) * 100, 8)}%`,
                    background: `rgba(187,92,246,${0.2 + (week.count / 7) * 0.7})`,
                    border: '1px solid rgba(187,92,246,0.3)',
                  }}
                />
                <span className="font-heading text-[9px]" style={{ color: '#2D3748' }}>W{weeklyData.length - i}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ion Monthly Summary Card */}
      <div className="glass-card p-5 mb-6" style={{ borderColor: 'rgba(187,92,246,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#BB5CF6' }} />
            <p className="font-heading font-bold text-sm text-white">Ion Monthly Summary</p>
          </div>
          {!monthlySummary && !summaryLoading && (
            <button
              onClick={loadMonthlySummary}
              className="font-heading text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(187,92,246,0.12)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.2)' }}
            >
              Generate
            </button>
          )}
        </div>

        {summaryLoading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
            <p className="font-heading text-sm" style={{ color: '#64748B' }}>Ion is reviewing your month...</p>
          </div>
        ) : monthlySummary ? (
          <div>
            <p className="font-heading text-sm leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
              {monthlySummary.summary}
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-center">
                <p className="font-heading font-bold text-lg" style={{ color: '#BB5CF6' }}>{monthlySummary.stats?.workouts || 0}</p>
                <p className="font-heading text-[10px]" style={{ color: '#475569' }}>WORKOUTS</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-bold text-lg" style={{ color: '#BB5CF6' }}>
                  {monthlySummary.stats?.avgDuration || 0}m
                </p>
                <p className="font-heading text-[10px]" style={{ color: '#475569' }}>AVG DURATION</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-bold text-lg" style={{ color: '#10B981' }}>
                  {monthlySummary.stats?.weightChange != null
                    ? `${parseFloat(monthlySummary.stats.weightChange) > 0 ? '+' : ''}${monthlySummary.stats.weightChange}kg`
                    : '—'}
                </p>
                <p className="font-heading text-[10px]" style={{ color: '#475569' }}>WEIGHT CHANGE</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="font-heading text-sm" style={{ color: '#475569' }}>
            Tap Generate and Ion will analyse your last 30 days and write a personalised coaching summary.
          </p>
        )}
      </div>

      {/* ── Goal Timeline Prediction (Elite) ─────────────────── */}
      <GoalTimelinePrediction
        measurements={measurements}
        goalTarget={goalTarget}
        planTier={planTier}
      />

      {/* Measurement history table */}
      {measurements.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>Measurement Log</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <th className="px-4 py-3 text-left font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>DATE</th>
                  <th className="px-4 py-3 text-right font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>WEIGHT</th>
                  <th className="px-4 py-3 text-right font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>WAIST</th>
                  <th className="px-4 py-3 text-right font-heading text-[10px] tracking-widest" style={{ color: '#475569' }}>BODY FAT</th>
                </tr>
              </thead>
              <tbody>
                {measurements.slice().reverse().map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 font-heading text-xs text-white">
                      {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#F0F0FF' }}>
                      {m.weight_kg ? `${m.weight_kg} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#F0F0FF' }}>
                      {m.waist_cm ? `${m.waist_cm} cm` : '—'}
                    </td>
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#F0F0FF' }}>
                      {m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Client-side tier derivation (no server call needed) ────────
function deriveClientTier(sub: any): 'starter' | 'pro' | 'elite' | 'trial' {
  if (!sub) return 'starter'
  if (sub.status === 'trial') {
    const end = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
    return (!end || end > new Date()) ? 'trial' : 'starter'
  }
  if (sub.status === 'active' || (sub.status === 'cancelled' && sub.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date())) {
    const name = (sub.plan_type || '').toLowerCase()
    if (name === 'elite') return 'elite'
    if (name === 'pro' || name === 'unlimited') return 'pro'
  }
  return 'starter'
}

// ── Goal Timeline Prediction card ──────────────────────────────
function GoalTimelinePrediction({
  measurements, goalTarget, planTier,
}: {
  measurements: any[]
  goalTarget: number | null
  planTier: 'starter' | 'pro' | 'elite' | 'trial'
}) {
  const isElite = planTier === 'elite'

  // Always show a card — locked for non-elite
  if (!isElite) {
    return (
      <div className="glass-card p-6 mb-6 relative overflow-hidden" style={{ border: '1px solid rgba(187,92,246,0.15)' }}>
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-10 backdrop-blur-sm rounded-2xl">
          <Lock size={22} style={{ color: '#BB5CF6' }} />
          <div className="text-center">
            <p className="font-heading font-bold text-sm text-white mb-1">Goal Timeline Prediction</p>
            <p className="font-heading text-xs mb-3" style={{ color: '#64748B' }}>Ion calculates exactly when you'll hit your goal — Elite only.</p>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-black text-xs tracking-wider"
              style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.1em', boxShadow: '0 0 16px rgba(187,92,246,0.35)' }}>
              Upgrade to Elite ⭐
            </Link>
          </div>
        </div>
        {/* Blurred preview behind */}
        <div className="flex items-center gap-3 mb-4 opacity-30">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(187,92,246,0.15)' }}>
            <Target size={18} style={{ color: '#BB5CF6' }} />
          </div>
          <div>
            <p className="font-heading font-black text-xs text-white tracking-wider" style={{ letterSpacing: '0.1em' }}>GOAL TIMELINE PREDICTION</p>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>Elite ⭐ feature</p>
          </div>
        </div>
        <div className="h-16 rounded-xl opacity-20" style={{ background: 'rgba(187,92,246,0.1)' }} />
      </div>
    )
  }

  // Need at least 3 weight data points for a meaningful trend
  const weightData = measurements
    .filter(m => m.weight_kg != null && m.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (weightData.length < 3) {
    return (
      <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(187,92,246,0.2)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(187,92,246,0.15)' }}>
            <Target size={18} style={{ color: '#BB5CF6' }} />
          </div>
          <div>
            <p className="font-heading font-black text-xs text-white tracking-wider" style={{ letterSpacing: '0.1em' }}>GOAL TIMELINE PREDICTION</p>
            <span className="font-heading text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(187,92,246,0.15)', color: '#BB5CF6' }}>ELITE ⭐</span>
          </div>
        </div>
        <p className="font-heading text-xs" style={{ color: '#64748B' }}>
          Log at least 3 weight measurements and Ion will calculate exactly when you'll hit your goal.
        </p>
      </div>
    )
  }

  // ── Linear regression on weight vs day index ───────────────
  const n = weightData.length
  const x = weightData.map((_, i) => i)
  const y = weightData.map(m => parseFloat(m.weight_kg))
  const xMean = x.reduce((s, v) => s + v, 0) / n
  const yMean = y.reduce((s, v) => s + v, 0) / n
  const slope = x.reduce((s, xi, i) => s + (xi - xMean) * (y[i] - yMean), 0) /
                x.reduce((s, xi) => s + (xi - xMean) ** 2, 0)

  const currentWeight = y[y.length - 1]
  const firstDate = new Date(weightData[0].date)
  const lastDate  = new Date(weightData[weightData.length - 1].date)
  const daySpan   = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / 86400000)
  const kgPerDay  = slope / Math.max(1, (n - 1) / daySpan)   // slope per calendar day

  const target = goalTarget ?? (kgPerDay < 0 ? currentWeight - 10 : currentWeight + 10)
  const deltaNeeded = target - currentWeight

  let prediction: string
  let daysLeft: number | null = null
  let confidence: 'high' | 'medium' | 'low' = 'medium'

  if (Math.abs(kgPerDay) < 0.001) {
    prediction = 'Your weight is stable — no clear trend yet.'
    confidence = 'low'
  } else if (Math.sign(deltaNeeded) !== Math.sign(kgPerDay)) {
    prediction = 'Your current trend is moving away from your goal. Talk to Ion.'
    confidence = 'low'
  } else {
    daysLeft = Math.round(Math.abs(deltaNeeded) / Math.abs(kgPerDay))
    const eta = new Date()
    eta.setDate(eta.getDate() + daysLeft)
    const etaStr = eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    prediction = etaStr
    confidence = n >= 8 ? 'high' : n >= 5 ? 'medium' : 'low'
  }

  const weeklyRate = parseFloat((kgPerDay * 7).toFixed(2))
  const trendLabel = weeklyRate === 0 ? 'Stable' : weeklyRate > 0 ? `+${weeklyRate} kg/wk` : `${weeklyRate} kg/wk`
  const trendColor = kgPerDay < 0 ? '#10B981' : kgPerDay > 0 ? '#F59E0B' : '#475569'
  const confidenceLabel = confidence === 'high' ? '● High confidence' : confidence === 'medium' ? '◐ Medium confidence' : '○ Low confidence (log more data)'
  const confidenceColor = confidence === 'high' ? '#10B981' : confidence === 'medium' ? '#F59E0B' : '#64748B'

  return (
    <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(187,92,246,0.25)', boxShadow: '0 0 30px rgba(187,92,246,0.08)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.25)' }}>
          <Target size={18} style={{ color: '#BB5CF6' }} />
        </div>
        <div>
          <p className="font-heading font-black text-xs text-white tracking-wider" style={{ letterSpacing: '0.1em' }}>GOAL TIMELINE PREDICTION</p>
          <span className="font-heading text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(187,92,246,0.15)', color: '#BB5CF6' }}>ELITE ⭐</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-[10px] tracking-wider mb-1" style={{ color: '#475569' }}>CURRENT WEIGHT</p>
          <p className="font-heading font-black text-2xl text-white">{currentWeight}<span className="text-sm font-normal ml-1" style={{ color: '#475569' }}>kg</span></p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-[10px] tracking-wider mb-1" style={{ color: '#475569' }}>GOAL TARGET</p>
          <p className="font-heading font-black text-2xl text-white">{target}<span className="text-sm font-normal ml-1" style={{ color: '#475569' }}>kg</span></p>
        </div>
      </div>

      <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
        <p className="font-heading text-[10px] tracking-widest uppercase mb-1" style={{ color: '#475569' }}>
          {daysLeft != null ? 'ESTIMATED GOAL DATE' : 'PREDICTION'}
        </p>
        <p className="font-heading font-black text-lg text-white">
          {daysLeft != null ? prediction : prediction}
        </p>
        {daysLeft != null && (
          <p className="font-heading text-xs mt-1" style={{ color: '#D88BFF' }}>
            {daysLeft} days from now at current pace
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-[10px] tracking-wider mb-0.5" style={{ color: '#475569' }}>WEEKLY RATE</p>
          <p className="font-heading font-bold text-sm" style={{ color: trendColor }}>{trendLabel}</p>
        </div>
        <p className="font-heading text-[10px]" style={{ color: confidenceColor }}>{confidenceLabel}</p>
      </div>
    </div>
  )
}

// ── Streak Calendar ────────────────────────────────────
function StreakCalendar({ activeDays }: { activeDays: Set<string> }) {
  const today = new Date()
  // 12 weeks back
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (12 * 7) + 1)
  // align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: Date[][] = []
  const cur = new Date(startDate)
  while (cur <= today) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  return (
    <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => {
            const key = day.toISOString().split('T')[0]
            const isActive = activeDays.has(key)
            const isFuture = day > today
            const isToday = key === today.toISOString().split('T')[0]
            return (
              <div
                key={di}
                title={key}
                className="w-2.5 h-2.5 flex-shrink-0 rounded-sm transition-all"
                style={{
                  background: isFuture ? 'transparent' : isActive ? '#BB5CF6' : 'rgba(255,255,255,0.04)',
                  boxShadow: isActive ? '0 0 6px rgba(187,92,246,0.5)' : isToday ? '0 0 0 1px rgba(187,92,246,0.5)' : 'none',
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Line Chart ────────────────────────────────────────
function LineChart({ data, color, unit }: { data: { date: string; value: number }[]; color: string; unit: string }) {
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 400
  const H = 100
  const PAD = 8

  const points = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.value - min) / range) * (H - PAD * 2),
    d,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`
  const gId = `cg_${color.replace('#', '')}`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#0A0A0A" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        <span className="font-heading text-xs" style={{ color: '#475569' }}>
          {new Date(data[0].date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </span>
        <span className="font-heading text-xs" style={{ color: '#475569' }}>
          {new Date(data[data.length - 1].date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────
function getWeeklyWorkouts(logs: any[]): { count: number; week: string }[] {
  const weeks: Record<string, number> = {}
  logs.forEach(log => {
    const d = new Date(log.logged_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weeks[key] = (weeks[key] || 0) + 1
  })
  return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([week, count]) => ({ week, count }))
}

function getStreakDays(logs: any[]): Set<string> {
  const days = new Set<string>()
  logs.forEach(log => {
    days.add(new Date(log.logged_at).toISOString().split('T')[0])
  })
  return days
}

function getStreak(logs: any[]): number {
  const days = new Set(logs.map(l => new Date(l.logged_at).toISOString().split('T')[0]))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().split('T')[0]
    if (!days.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
