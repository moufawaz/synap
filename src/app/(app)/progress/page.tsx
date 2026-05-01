'use client'

import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

export const dynamic = 'force-dynamic'

const CHART_METRICS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', color: '#BB5CF6' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', color: '#F97316' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', color: '#10B981' },
  { key: 'bicep_right_cm', label: 'Bicep', unit: 'cm', color: '#3B82F6' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', color: '#EF4444' },
]

export default function ProgressPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([])
  const [selectedMetric, setSelectedMetric] = useState('weight_kg')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [mRes, wRes] = await Promise.all([
      fetch('/api/measurements'),
      fetch('/api/log-workout'),
    ])
    const mData = await mRes.json()
    const wData = await wRes.json()

    setMeasurements((mData.measurements || []).reverse())
    setWorkoutLogs(wData.logs || [])
    setLoading(false)
  }

  const metric = CHART_METRICS.find(m => m.key === selectedMetric)!
  const chartData = measurements
    .filter(m => m[selectedMetric] != null)
    .map(m => ({ date: m.date, value: m[selectedMetric] }))

  const firstVal = chartData[0]?.value
  const lastVal = chartData[chartData.length - 1]?.value
  const totalChange = firstVal != null && lastVal != null ? lastVal - firstVal : null

  // Weekly workout count (last 4 weeks)
  const weeklyData = getWeeklyWorkouts(workoutLogs)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#3B82F6', letterSpacing: '0.14em' }}>ANALYTICS</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>Your Progress</h1>
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
                <p className="font-heading font-black text-lg text-white">
                  {last ?? '—'}
                  <span className="text-xs font-normal ml-1" style={{ color: '#475569' }}>{m.unit}</span>
                </p>
                {change != null && (
                  <div className="flex items-center gap-1 mt-1">
                    {up ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
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
          <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
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

      {/* Workout frequency */}
      <div className="glass-card p-5 mb-6">
        <p className="font-heading font-black text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.06em' }}>
          Workout Frequency
        </p>
        {weeklyData.length === 0 ? (
          <p className="font-heading text-sm text-center py-4" style={{ color: '#475569' }}>No workouts logged yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-24">
            {weeklyData.map((week, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-heading text-xs font-bold" style={{ color: '#BB5CF6' }}>{week.count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((week.count / 7) * 100, 8)}%`,
                    background: `rgba(187,92,246,${0.2 + (week.count / 7) * 0.6})`,
                    border: '1px solid rgba(187,92,246,0.3)',
                  }}
                />
                <span className="font-heading text-[9px]" style={{ color: '#2D3748' }}>W{weeklyData.length - i}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Measurement history table */}
      {measurements.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
              Measurement Log
            </p>
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
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#E2E8F0' }}>
                      {m.weight_kg ? `${m.weight_kg} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#E2E8F0' }}>
                      {m.waist_cm ? `${m.waist_cm} cm` : '—'}
                    </td>
                    <td className="px-4 py-3 font-heading text-xs text-right" style={{ color: '#E2E8F0' }}>
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

// ── Line Chart ─────────────────────────────────────────────

function LineChart({ data, color, unit }: { data: { date: string; value: number }[]; color: string; unit: string }) {
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 400
  const H = 100
  const PAD = 8

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (d.value - min) / range) * (H - PAD * 2)
    return { x, y, d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`cg_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#cg_${color.replace('#', '')})`} />
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

function getWeeklyWorkouts(logs: any[]): { count: number; week: string }[] {
  const weeks: Record<string, number> = {}
  logs.forEach(log => {
    const d = new Date(log.logged_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    weeks[key] = (weeks[key] || 0) + 1
  })
  return Object.entries(weeks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([week, count]) => ({ week, count }))
}
