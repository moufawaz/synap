'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Activity, ArrowRight, Brain, CheckCircle2, Dumbbell, Flame, Ruler, Sparkles, UtensilsCrossed } from 'lucide-react'

type CoachFeatures = {
  timeline?: Array<{ date: string; type: string; title: string; body: string }>
  mealNow?: {
    title: string
    subtitle: string
    items: string[]
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    remaining?: { calories: number; protein: number; carbs: number; fat: number }
    reason: string
  }
  weeklyMission?: { title: string; target: number; progress: number; unit: string; why: string }
  symmetryCoach?: { status: string; summary: string; plan: string[] }
  plateau?: { detected: boolean; message: string; options: Array<{ id: string; label: string; description: string }> }
}

export default function CoachFeaturesPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<CoachFeatures | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/coach-features')
      .then(res => res.ok ? res.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  async function applyPlateau(action: string) {
    setApplying(action)
    setAppliedMessage(null)
    try {
      const res = await fetch('/api/coach-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not apply adjustment')
      setAppliedMessage(result.message)
      const fresh = await fetch('/api/coach-features').then(r => r.json())
      setData(fresh)
    } catch (error: any) {
      setAppliedMessage(error?.message || 'Could not apply adjustment')
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-5 mb-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10 mb-4" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="h-28 rounded-xl bg-white/5" />
          <div className="h-28 rounded-xl bg-white/5" />
          <div className="h-28 rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const missionPct = data.weeklyMission?.target
    ? Math.min(100, Math.round((data.weeklyMission.progress / data.weeklyMission.target) * 100))
    : 0

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={17} style={{ color: '#BB5CF6' }} />
          <h2 className="font-heading text-sm font-bold text-white tracking-wider">ION COACHING ENGINE</h2>
        </div>
        <Link href="/form-check" className="font-heading text-xs font-bold flex items-center gap-1" style={{ color: '#D88BFF' }}>
          Form check <ArrowRight size={13} />
        </Link>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
        <Card icon={<Flame size={16} />} title="Weekly Mission" tone="#F97316">
          <p className="font-heading text-base font-bold text-white">{data.weeklyMission?.title}</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>{data.weeklyMission?.why}</p>
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${missionPct}%`, background: '#F97316' }} />
          </div>
          <p className="font-heading text-xs mt-2" style={{ color: '#94A3B8' }}>
            {data.weeklyMission?.progress}/{data.weeklyMission?.target} {data.weeklyMission?.unit}
          </p>
        </Card>

        <Card icon={<UtensilsCrossed size={16} />} title="What Should I Eat Now?" tone="#10B981">
          <p className="font-heading text-base font-bold text-white">{data.mealNow?.title}</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>{data.mealNow?.subtitle}</p>
          <div className="flex gap-2 mt-4 text-xs font-heading">
            <Pill>{Math.round(data.mealNow?.calories ?? 0)} kcal</Pill>
            <Pill>{Math.round(data.mealNow?.protein_g ?? 0)}g protein</Pill>
          </div>
          <Link href="/nutrition" className="inline-flex items-center gap-1 mt-4 font-heading text-xs font-bold" style={{ color: '#10B981' }}>
            Open nutrition <ArrowRight size={12} />
          </Link>
        </Card>

        <Card icon={<Ruler size={16} />} title="Body Symmetry Coach" tone="#3B82F6">
          <p className="font-heading text-base font-bold text-white">{data.symmetryCoach?.status === 'attention' ? 'Correction needed' : 'Balance check'}</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>{data.symmetryCoach?.summary}</p>
          <Link href="/measurements" className="inline-flex items-center gap-1 mt-4 font-heading text-xs font-bold" style={{ color: '#60A5FA' }}>
            Review symmetry <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      {data.plateau?.detected && (
        <div className="glass-card p-4 mt-3" style={{ borderColor: 'rgba(245,158,11,0.22)' }}>
          <div className="flex items-start gap-3">
            <Activity size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="font-heading text-sm font-bold text-white">Smart Plateau Intervention</p>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>{data.plateau.message}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {data.plateau.options.map(option => (
                  <button
                    key={option.id}
                    onClick={() => applyPlateau(option.id)}
                    disabled={!!applying}
                    className="px-3 py-2 rounded-xl font-heading text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      color: '#F59E0B',
                      opacity: applying && applying !== option.id ? 0.5 : 1,
                    }}
                  >
                    {applying === option.id ? 'Applying...' : option.label}
                  </button>
                ))}
              </div>
              {appliedMessage && (
                <p className="flex items-center gap-1 mt-3 font-heading text-xs" style={{ color: '#10B981' }}>
                  <CheckCircle2 size={13} /> {appliedMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!compact && data.timeline && data.timeline.length > 0 && (
        <div className="glass-card p-4 mt-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-sm font-bold text-white">Coach Memory Timeline</p>
            <Link href="/progress" className="font-heading text-xs font-bold" style={{ color: '#D88BFF' }}>View all</Link>
          </div>
          <div className="space-y-3">
            {data.timeline.slice(0, 3).map((item, index) => (
              <div key={`${item.date}-${index}`} className="flex gap-3">
                <div className="mt-1 w-2 h-2 rounded-full" style={{ background: '#BB5CF6', boxShadow: '0 0 12px rgba(187,92,246,0.55)' }} />
                <div>
                  <p className="font-heading text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Card({ icon, title, tone, children }: { icon: ReactNode; title: string; tone: string; children: ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${tone}1A`, color: tone, border: `1px solid ${tone}33` }}>
          {icon}
        </div>
        <p className="font-heading text-[11px] font-bold tracking-widest uppercase" style={{ color: tone }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.06)' }}>
      {children}
    </span>
  )
}
