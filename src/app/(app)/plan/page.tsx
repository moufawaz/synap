'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import Link from 'next/link'
import { Utensils, Dumbbell, ChevronDown, ChevronUp, Flame, Beef, Wheat, Droplets, Calendar, Clock, Target, TrendingUp, MessageSquare, FlaskConical, Lock, Zap, ShieldCheck, Sparkles, ShoppingBasket } from 'lucide-react'
import { VideoButton } from '@/components/ui/ExerciseVideoModal'
import { RecipeButton } from '@/components/ui/RecipeModal'

export const dynamic = 'force-dynamic'

const PLAN_MODIFY_WINDOW_DAYS = 30

type Tab = 'diet' | 'workout'

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>('diet')
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [workoutPlan, setWorkoutPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [planDaysLeft, setPlanDaysLeft] = useState<number | null>(null)
  const [planTier, setPlanTier] = useState<string>('starter')
  const [supplementRec, setSupplementRec] = useState<any>(null)
  const [suppLoading, setSuppLoading] = useState(false)
  const [suppExpanded, setSuppExpanded] = useState(false)

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [dietRes, workoutRes, profileRes, tierRes] = await Promise.all([
      supabase.from('diet_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('workout_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
      fetch('/api/me/subscription').then(r => r.json()).catch(() => ({ tier: 'starter' })),
    ])

    setDietPlan(dietRes.data?.plan_json || null)
    setWorkoutPlan(workoutRes.data?.plan_json || null)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)

    if (workoutRes.data?.created_at) {
      const age = Math.floor((Date.now() - new Date(workoutRes.data.created_at).getTime()) / 86400000)
      setPlanDaysLeft(Math.max(0, PLAN_MODIFY_WINDOW_DAYS - age))
    }

    // Tier comes from the server (service-role — never blocked by RLS)
    const tier: string = tierRes.tier || 'starter'
    setPlanTier(tier)

    // Fetch supplement recommendations for Elite users (or everyone in launch mode)
    const launchMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'
    if (tier === 'elite' || launchMode) {
      setSuppLoading(true)
      try {
        const res = await fetch('/api/supplement-recommendations')
        if (res.ok) {
          const { recommendation } = await res.json()
          setSupplementRec(recommendation)
        }
      } catch { /* silent */ }
      setSuppLoading(false)
    }

    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!dietPlan && !workoutPlan) return <NoPlanState gender={gender} />

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>YOUR PLANS</p>
        <h1 className="font-heading font-bold text-2xl text-white tracking-wide">My Programme</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>Ion-generated plans tailored to your goals</p>
      </div>

      {/* Plan modification time banner */}
      {planDaysLeft !== null && (
        <Link href="/chat">
          <div
            className="mb-5 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:opacity-90"
            style={{
              background: planDaysLeft > 7 ? 'rgba(16,137,129,0.06)' : planDaysLeft > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${planDaysLeft > 7 ? 'rgba(16,137,129,0.2)' : planDaysLeft > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={14} style={{ color: planDaysLeft > 7 ? '#108981' : planDaysLeft > 0 ? '#F59E0B' : '#EF4444' }} />
              <div>
                <p className="font-heading font-bold text-xs text-white tracking-wider">
                  {planDaysLeft > 0 ? `${planDaysLeft} DAYS LEFT TO MODIFY` : 'MODIFICATION WINDOW CLOSED'}
                </p>
                <p className="font-heading text-[10px] mt-0.5" style={{ color: '#64748B' }}>
                  {planDaysLeft > 0
                    ? 'Ask Ion in chat to adjust your nutrition or exercise plan.'
                    : 'Request a new plan or renewal through Ion chat.'}
                </p>
              </div>
            </div>
            <MessageSquare size={14} style={{ color: '#475569', flexShrink: 0 }} />
          </div>
        </Link>
      )}

      {/* Supplement Recommendations */}
      <SupplementCard
        tier={planTier}
        recommendation={supplementRec}
        loading={suppLoading}
        expanded={suppExpanded}
        onToggle={() => setSuppExpanded(e => !e)}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setTab('diet')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg font-heading font-semibold text-sm transition-all"
          style={{
            background: tab === 'diet' ? 'rgba(187,92,246,0.2)' : 'transparent',
            color: tab === 'diet' ? '#D88BFF' : '#64748B',
            border: tab === 'diet' ? '1px solid rgba(187,92,246,0.3)' : '1px solid transparent',
          }}
        >
          <Utensils size={14} /> Diet Plan
        </button>
        <button
          onClick={() => setTab('workout')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg font-heading font-semibold text-sm transition-all"
          style={{
            background: tab === 'workout' ? 'rgba(187,92,246,0.1)' : 'transparent',
            color: tab === 'workout' ? '#BB5CF6' : '#64748B',
            border: tab === 'workout' ? '1px solid rgba(187,92,246,0.25)' : '1px solid transparent',
          }}
        >
          <Dumbbell size={14} /> Workout Plan
        </button>
      </div>

      {tab === 'diet' ? (
        <DietPlanView plan={dietPlan} expandedMeal={expandedMeal} setExpandedMeal={setExpandedMeal} />
      ) : (
        <WorkoutPlanView plan={workoutPlan} expandedDay={expandedDay} setExpandedDay={setExpandedDay} />
      )}
    </div>
  )
}

// ── Diet Plan View ─────────────────────────────────────
function DietPlanView({ plan, expandedMeal, setExpandedMeal }: any) {
  if (!plan) return (
    <div className="glass-card p-8 text-center">
      <Utensils size={32} style={{ color: '#64748B' }} className="mx-auto mb-3" />
      <p className="font-heading font-bold text-white mb-1">No diet plan yet</p>
      <p className="font-heading text-sm" style={{ color: '#64748B' }}>Complete onboarding to generate your personalised diet plan.</p>
    </div>
  )

  const macros = [
    { label: 'Calories', value: plan.daily_calories || plan.calories_per_day, unit: 'kcal', icon: <Flame size={14} />, color: '#F59E0B' },
    { label: 'Protein', value: plan.macros?.protein_g || plan.protein_g, unit: 'g', icon: <Beef size={14} />, color: '#EF4444' },
    { label: 'Carbs', value: plan.macros?.carbs_g || plan.carbs_g, unit: 'g', icon: <Wheat size={14} />, color: '#F59E0B' },
    { label: 'Fat', value: plan.macros?.fat_g || plan.fat_g, unit: 'g', icon: <Droplets size={14} />, color: '#BB5CF6' },
  ]

  const weeks = plan.weeks || []
  const meals = plan.meals || [] // flat meal list if no weeks

  return (
      <div className="flex flex-col gap-6">

      <Link href="/grocery-list" className="glass-card p-4 flex items-center justify-between gap-3" style={{ borderColor: 'rgba(16,185,129,0.18)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
            <ShoppingBasket size={16} />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-white">Weekly Grocery Builder</p>
            <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>Generate a grouped shopping list from this diet plan.</p>
          </div>
        </div>
        <span className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>OPEN</span>
      </Link>

      {/* Macro summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {macros.map(m => (
          <div key={m.label} className="glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: m.color }}>
              {m.icon}
              <span className="font-heading text-xs font-semibold" style={{ color: m.color }}>{m.label}</span>
            </div>
            <p className="font-heading font-bold text-xl text-white">{m.value || '—'}</p>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Plan info */}
      {(plan.name || plan.description) && (
        <div className="glass-card p-5" style={{ borderColor: 'rgba(187,92,246,0.15)' }}>
          {plan.name && <p className="font-heading font-bold text-white mb-1">{plan.name}</p>}
          {plan.description && <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.description}</p>}
        </div>
      )}

      {/* Weekly meal schedule */}
      {weeks.length > 0 ? (
        weeks.map((week: any, wi: number) => (
          <div key={wi}>
            <p className="font-heading font-bold text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>
              WEEK {week.week || wi + 1}
            </p>
            <div className="flex flex-col gap-3">
              {(week.days || []).map((day: any, di: number) => {
                const key = `w${wi}-d${di}`
                const expanded = expandedMeal === key
                return (
                  <div key={di} className="rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => setExpandedMeal(expanded ? null : key)}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-xs" style={{ background: 'rgba(187,92,246,0.15)', color: '#D88BFF' }}>
                          {(day.day_name || day.day || `D${di+1}`).slice(0,3).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-heading font-semibold text-sm text-white">{day.day_name || day.day || `Day ${di+1}`}</p>
                          <p className="font-heading text-xs" style={{ color: '#64748B' }}>{day.total_calories || ''} {day.total_calories ? 'kcal' : ''}</p>
                        </div>
                      </div>
                      {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        {(day.meals || []).map((meal: any, mi: number) => (
                          <MealCard key={mi} meal={meal} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      ) : meals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {meals.map((meal: any, mi: number) => (
            <MealCard key={mi} meal={meal} />
          ))}
        </div>
      ) : null}

      {/* Hydration & notes */}
      {(plan.hydration_liters || plan.water_l) && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
          <Droplets size={18} style={{ color: '#BB5CF6' }} />
          <p className="font-heading text-sm" style={{ color: '#94A3B8' }}>
            Daily water target: <span className="text-white font-semibold">{plan.hydration_liters || plan.water_l}L</span>
          </p>
        </div>
      )}
      {plan.notes && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>ION NOTES</p>
          <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.notes}</p>
        </div>
      )}
    </div>
  )
}

function MealCard({ meal }: { meal: any }) {
  const [expanded, setExpanded] = useState(false)
  const foods = meal.foods || meal.items || []
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-base">{getMealEmoji(meal.meal_name || meal.name)}</span>
          <div className="text-left">
            <p className="font-heading font-semibold text-sm text-white">{meal.meal_name || meal.name}</p>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>
              {meal.time || ''}{meal.calories ? ` - ${meal.calories} kcal` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {meal.protein_g && <span className="font-heading text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>{meal.protein_g}g P</span>}
          {expanded ? <ChevronUp size={12} style={{ color: '#475569' }} /> : <ChevronDown size={12} style={{ color: '#475569' }} />}
        </div>
      </button>
      {expanded && foods.length > 0 && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="flex justify-end pt-3">
            <RecipeButton meal={meal} />
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {foods.map((food: any, fi: number) => {
              const name = food.item || food.name || food.food || (typeof food === 'string' ? food : '')
              const amount = food.amount || food.quantity || food.serving || ''
              const kcal = food.calories ?? food.kcal ?? null
              if (!name) return null
              return (
                <div key={fi} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-heading text-sm" style={{ color: '#94A3B8' }}>{name}</span>
                    {amount ? <span className="font-heading text-xs ml-1" style={{ color: '#475569' }}>- {amount}</span> : null}
                  </div>
                  {kcal !== null && (
                    <span className="font-heading text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B' }}>
                      {kcal} kcal
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function getMealEmoji(name: string = '') {
  const n = name.toLowerCase()
  if (n.includes('breakfast') || n.includes('morning')) return '🌅'
  if (n.includes('lunch')) return '☀️'
  if (n.includes('dinner') || n.includes('evening')) return '🌙'
  if (n.includes('snack') || n.includes('pre') || n.includes('post')) return '⚡'
  return '🍽️'
}

// ── Workout Plan View ──────────────────────────────────
function WorkoutPlanView({ plan, expandedDay, setExpandedDay }: any) {
  if (!plan) return (
    <div className="glass-card p-8 text-center">
      <Dumbbell size={32} style={{ color: '#64748B' }} className="mx-auto mb-3" />
      <p className="font-heading font-bold text-white mb-1">No workout plan yet</p>
      <p className="font-heading text-sm" style={{ color: '#64748B' }}>Complete onboarding to generate your personalised workout programme.</p>
    </div>
  )

  const stats = [
    { label: 'Schedule', value: plan.schedule || plan.days_per_week ? `${plan.days_per_week}x/week` : '—', icon: <Calendar size={14} />, color: '#BB5CF6' },
    { label: 'Duration', value: plan.session_duration_min ? `${plan.session_duration_min} min` : plan.duration || '—', icon: <Clock size={14} />, color: '#BB5CF6' },
    { label: 'Type', value: plan.split_type?.replace(/_/g, ' ') || plan.plan_type || '—', icon: <Target size={14} />, color: '#10B981' },
    { label: 'Level', value: plan.level || plan.difficulty || '—', icon: <TrendingUp size={14} />, color: '#F59E0B' },
  ]

  const weeks = plan.weeks || []
  const days = plan.days || []

  return (
    <div className="flex flex-col gap-6">

      {/* Plan stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
              {s.icon}
              <span className="font-heading text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
            </div>
            <p className="font-heading font-bold text-sm text-white capitalize">{String(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Plan description */}
      {plan.name && (
        <div className="glass-card p-5" style={{ borderColor: 'rgba(187,92,246,0.15)' }}>
          <p className="font-heading font-bold text-white mb-1">{plan.name}</p>
          {plan.description && <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.description}</p>}
          {plan.progressive_overload && <p className="font-heading text-xs mt-2" style={{ color: '#BB5CF6' }}>⚡ {plan.progressive_overload}</p>}
        </div>
      )}

      {/* Weekly breakdown */}
      {weeks.length > 0 ? (
        weeks.map((week: any, wi: number) => (
          <div key={wi}>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-heading font-bold text-xs tracking-widest uppercase" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>
                WEEK {week.week || wi + 1}
              </p>
              {week.focus && <span className="font-heading text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.08)', color: '#BB5CF6' }}>{week.focus}</span>}
            </div>
            <DayList days={week.days || []} expandedDay={expandedDay} setExpandedDay={setExpandedDay} prefix={`w${wi}`} />
          </div>
        ))
      ) : days.length > 0 ? (
        <DayList days={days} expandedDay={expandedDay} setExpandedDay={setExpandedDay} prefix="d" />
      ) : null}

      {/* Notes */}
      {plan.notes && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-heading text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>ION NOTES</p>
          <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.notes}</p>
        </div>
      )}
    </div>
  )
}

function DayList({ days, expandedDay, setExpandedDay, prefix }: any) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day: any, di: number) => {
        const key = `${prefix}-${di}`
        const expanded = expandedDay === key
        const isRest = !day.exercises || day.exercises.length === 0
        return (
          <div key={di} className="rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => !isRest && setExpandedDay(expanded ? null : key)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-xs"
                  style={{ background: isRest ? 'rgba(255,255,255,0.04)' : 'rgba(187,92,246,0.1)', color: isRest ? '#475569' : '#BB5CF6' }}>
                  {(day.day_name || day.day || '').slice(0,3).toUpperCase() || `D${di+1}`}
                </div>
                <div className="text-left">
                  <p className="font-heading font-semibold text-sm text-white">{day.muscle_focus || day.focus || day.day_name || `Day ${di+1}`}</p>
                  <p className="font-heading text-xs" style={{ color: '#64748B' }}>
                    {isRest ? 'Rest day' : `${day.exercises?.length || 0} exercises - ${day.duration_min || '-'} min`}
                  </p>
                </div>
              </div>
              {!isRest && (expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />)}
            </button>
            {expanded && !isRest && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex flex-col gap-2.5 mt-3">
                  {day.exercises.map((ex: any, ei: number) => (
                    <div key={ei} className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-sm text-white">{ex.name}</p>
                        <p className="font-heading text-xs" style={{ color: '#64748B' }}>{ex.sets} sets x {ex.reps} - {ex.rest_sec}s rest</p>
                      </div>
                      <span className="font-heading text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(187,92,246,0.1)', color: '#D88BFF' }}>
                        {ex.muscle_group}
                      </span>
                      <VideoButton exerciseName={ex.name} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Supplement Recommendations Card ───────────────────────────────────────────
const EVIDENCE_COLORS: Record<string, string> = {
  strong:   '#10B981',
  moderate: '#F59E0B',
  emerging: '#64748B',
}
const PRIORITY_COLORS: Record<string, string> = {
  essential:   '#EF4444',
  recommended: '#BB5CF6',
  optional:    '#475569',
}
const CATEGORY_ICONS: Record<string, string> = {
  Performance: '⚡',
  Recovery:    '🔄',
  Health:      '🛡️',
  Cognition:   '🧠',
}

function SupplementCard({ tier, recommendation, loading, expanded, onToggle }: {
  tier: string
  recommendation: any
  loading: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const isElite = tier === 'elite' || process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'
  const recs: any[] = recommendation?.recommendations?.supplements || []
  const hasData = recs.length > 0

  // Non-elite locked state
  if (!isElite) {
    return (
      <div className="mb-5 rounded-2xl overflow-hidden relative" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.15)' }}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(187,92,246,0.12)' }}>
            <FlaskConical size={18} style={{ color: '#BB5CF6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-heading font-bold text-sm text-white">Ion Supplement Stack</p>
              <Lock size={12} style={{ color: '#475569' }} />
            </div>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>Personalised evidence-based supplement recommendations — Elite only</p>
          </div>
          <Link href="/pricing">
            <button className="font-heading font-bold text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:opacity-90" style={{ background: 'rgba(187,92,246,0.2)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.3)' }}>
              Upgrade
            </button>
          </Link>
        </div>
        {/* Blurred preview */}
        <div className="relative px-5 pb-5" style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
          {['Creatine Monohydrate', 'Whey Protein', 'Vitamin D3'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 mb-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-base">⚡</span>
              <div>
                <p className="font-heading font-semibold text-sm text-white">{name}</p>
                <p className="font-heading text-xs" style={{ color: '#64748B' }}>5g · Post-workout · Strong evidence</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="mb-5 p-5 rounded-2xl flex items-center gap-3" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.15)' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
        <p className="font-heading text-sm" style={{ color: '#64748B' }}>Loading your supplement recommendations…</p>
      </div>
    )
  }

  // No data yet — plan hasn't been renewed since feature launch
  if (!hasData) {
    return (
      <div className="mb-5 p-5 rounded-2xl flex items-center gap-4" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.15)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(187,92,246,0.12)' }}>
          <FlaskConical size={18} style={{ color: '#BB5CF6' }} />
        </div>
        <div>
          <p className="font-heading font-bold text-sm text-white mb-0.5">Ion Supplement Stack</p>
          <p className="font-heading text-xs" style={{ color: '#64748B' }}>Supplement recommendations will appear after your next plan renewal cycle.</p>
        </div>
      </div>
    )
  }

  const rec = recommendation.recommendations
  const essentials = recs.filter((s: any) => s.priority === 'essential')
  const others = recs.filter((s: any) => s.priority !== 'essential')

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.2)' }}>
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(187,92,246,0.12)' }}>
            <FlaskConical size={18} style={{ color: '#BB5CF6' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-heading font-bold text-sm text-white">Ion Supplement Stack</p>
              <span className="font-heading text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.15)', color: '#D88BFF' }}>
                Cycle {rec.cycle || recommendation.cycle_number}
              </span>
            </div>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>{rec.headline || `${recs.length} personalised recommendations`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-heading text-xs" style={{ color: '#475569' }}>{recs.length} supplements</span>
          {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
        </div>
      </button>

      {/* Collapsed summary — show essentials inline */}
      {!expanded && (
        <div className="px-5 pb-4 flex flex-wrap gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="pt-3 flex flex-wrap gap-2 w-full">
            {essentials.slice(0, 4).map((s: any, i: number) => (
              <span key={i} className="font-heading text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(187,92,246,0.08)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.15)' }}>
                {CATEGORY_ICONS[s.category] || '💊'} {s.name}
              </span>
            ))}
            {recs.length > 4 && (
              <span className="font-heading text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
                +{recs.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded — full list */}
      {expanded && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {/* Essentials */}
          {essentials.length > 0 && (
            <>
              <p className="font-heading text-[10px] font-bold uppercase tracking-widest mt-4 mb-2" style={{ color: '#EF4444' }}>ESSENTIAL</p>
              <div className="flex flex-col gap-2">
                {essentials.map((s: any, i: number) => <SupplementRow key={i} s={s} />)}
              </div>
            </>
          )}
          {/* Recommended + Optional */}
          {others.length > 0 && (
            <>
              <p className="font-heading text-[10px] font-bold uppercase tracking-widest mt-4 mb-2" style={{ color: '#BB5CF6' }}>RECOMMENDED & OPTIONAL</p>
              <div className="flex flex-col gap-2">
                {others.map((s: any, i: number) => <SupplementRow key={i} s={s} />)}
              </div>
            </>
          )}
          {/* Stack notes */}
          {rec.stack_notes && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.12)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} style={{ color: '#BB5CF6' }} />
                <p className="font-heading text-[10px] font-bold uppercase tracking-widest" style={{ color: '#BB5CF6' }}>ION'S TAKE</p>
              </div>
              <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{rec.stack_notes}</p>
            </div>
          )}
          {/* Generated timestamp */}
          {recommendation.generated_at && (
            <p className="font-heading text-[10px] mt-3 text-right" style={{ color: '#334155' }}>
              Generated {new Date(recommendation.generated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SupplementRow({ s }: { s: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-lg flex-shrink-0">{CATEGORY_ICONS[s.category] || '💊'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading font-semibold text-sm text-white">{s.name}</p>
            <span className="font-heading text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${PRIORITY_COLORS[s.priority]}20`, color: PRIORITY_COLORS[s.priority] }}>
              {s.priority}
            </span>
          </div>
          <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>
            {s.dose} - {s.timing}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-heading text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${EVIDENCE_COLORS[s.evidence] || '#64748B'}18`, color: EVIDENCE_COLORS[s.evidence] || '#64748B' }}>
            {s.evidence}
          </span>
          {open ? <ChevronUp size={12} style={{ color: '#475569' }} /> : <ChevronDown size={12} style={{ color: '#475569' }} />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <p className="font-heading text-sm mt-2 leading-relaxed" style={{ color: '#94A3B8' }}>{s.benefit}</p>
          {s.notes && (
            <p className="font-heading text-xs mt-2 leading-relaxed" style={{ color: '#475569' }}>
              <span style={{ color: '#BB5CF6' }}>Note: </span>{s.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function NoPlanState({ gender }: { gender: 'male' | 'female' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <IonAvatar gender={gender} size="lg" />
        <div>
          <p className="font-heading font-bold text-lg text-white mb-2">No plans yet</p>
          <p className="font-heading text-sm mb-5" style={{ color: '#64748B' }}>Complete onboarding so Ion can build your personalised diet and workout plans.</p>
          <a href="/onboarding" className="btn-primary text-sm w-full flex justify-center">Start with Ion</a>
        </div>
      </div>
    </div>
  )
}
