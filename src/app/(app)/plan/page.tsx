'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { Utensils, Dumbbell, ChevronDown, ChevronUp, Flame, Beef, Wheat, Droplets, Calendar, Clock, Target, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Tab = 'diet' | 'workout'

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>('diet')
  const [dietPlan, setDietPlan] = useState<any>(null)
  const [workoutPlan, setWorkoutPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [dietRes, workoutRes, profileRes] = await Promise.all([
      supabase.from('diet_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('workout_plans').select('*').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
    ])

    setDietPlan(dietRes.data?.plan_json || null)
    setWorkoutPlan(workoutRes.data?.plan_json || null)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!dietPlan && !workoutPlan) return <NoPlanState gender={gender} />

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#7C3AED', letterSpacing: '0.14em' }}>YOUR PLANS</p>
        <h1 className="font-heading font-bold text-2xl text-white tracking-wide">My Programme</h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#64748B' }}>Ion-generated plans tailored to your goals</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setTab('diet')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg font-heading font-semibold text-sm transition-all"
          style={{
            background: tab === 'diet' ? 'rgba(124,58,237,0.2)' : 'transparent',
            color: tab === 'diet' ? '#A78BFA' : '#64748B',
            border: tab === 'diet' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
          }}
        >
          <Utensils size={14} /> Diet Plan
        </button>
        <button
          onClick={() => setTab('workout')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg font-heading font-semibold text-sm transition-all"
          style={{
            background: tab === 'workout' ? 'rgba(34,211,238,0.1)' : 'transparent',
            color: tab === 'workout' ? '#22D3EE' : '#64748B',
            border: tab === 'workout' ? '1px solid rgba(34,211,238,0.25)' : '1px solid transparent',
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
    { label: 'Fat', value: plan.macros?.fat_g || plan.fat_g, unit: 'g', icon: <Droplets size={14} />, color: '#22D3EE' },
  ]

  const weeks = plan.weeks || []
  const meals = plan.meals || [] // flat meal list if no weeks

  return (
    <div className="flex flex-col gap-6">

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
        <div className="glass-card p-5" style={{ borderColor: 'rgba(124,58,237,0.15)' }}>
          {plan.name && <p className="font-heading font-bold text-white mb-1">{plan.name}</p>}
          {plan.description && <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.description}</p>}
        </div>
      )}

      {/* Weekly meal schedule */}
      {weeks.length > 0 ? (
        weeks.map((week: any, wi: number) => (
          <div key={wi}>
            <p className="font-heading font-bold text-xs tracking-widest uppercase mb-3" style={{ color: '#7C3AED', letterSpacing: '0.14em' }}>
              WEEK {week.week || wi + 1}
            </p>
            <div className="flex flex-col gap-3">
              {(week.days || []).map((day: any, di: number) => {
                const key = `w${wi}-d${di}`
                const expanded = expandedMeal === key
                return (
                  <div key={di} className="rounded-2xl overflow-hidden" style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => setExpandedMeal(expanded ? null : key)}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-xs" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
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
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
          <Droplets size={18} style={{ color: '#22D3EE' }} />
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
              {meal.time || ''}{meal.calories ? ` · ${meal.calories} kcal` : ''}
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
                    {amount ? <span className="font-heading text-xs ml-1" style={{ color: '#475569' }}>· {amount}</span> : null}
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
    { label: 'Schedule', value: plan.schedule || plan.days_per_week ? `${plan.days_per_week}x/week` : '—', icon: <Calendar size={14} />, color: '#7C3AED' },
    { label: 'Duration', value: plan.session_duration_min ? `${plan.session_duration_min} min` : plan.duration || '—', icon: <Clock size={14} />, color: '#22D3EE' },
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
        <div className="glass-card p-5" style={{ borderColor: 'rgba(34,211,238,0.15)' }}>
          <p className="font-heading font-bold text-white mb-1">{plan.name}</p>
          {plan.description && <p className="font-heading text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{plan.description}</p>}
          {plan.progressive_overload && <p className="font-heading text-xs mt-2" style={{ color: '#22D3EE' }}>⚡ {plan.progressive_overload}</p>}
        </div>
      )}

      {/* Weekly breakdown */}
      {weeks.length > 0 ? (
        weeks.map((week: any, wi: number) => (
          <div key={wi}>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-heading font-bold text-xs tracking-widest uppercase" style={{ color: '#22D3EE', letterSpacing: '0.14em' }}>
                WEEK {week.week || wi + 1}
              </p>
              {week.focus && <span className="font-heading text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,211,238,0.08)', color: '#22D3EE' }}>{week.focus}</span>}
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
          <div key={di} className="rounded-2xl overflow-hidden" style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => !isRest && setExpandedDay(expanded ? null : key)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-xs"
                  style={{ background: isRest ? 'rgba(255,255,255,0.04)' : 'rgba(34,211,238,0.1)', color: isRest ? '#475569' : '#22D3EE' }}>
                  {(day.day_name || day.day || '').slice(0,3).toUpperCase() || `D${di+1}`}
                </div>
                <div className="text-left">
                  <p className="font-heading font-semibold text-sm text-white">{day.muscle_focus || day.focus || day.day_name || `Day ${di+1}`}</p>
                  <p className="font-heading text-xs" style={{ color: '#64748B' }}>
                    {isRest ? 'Rest day' : `${day.exercises?.length || 0} exercises · ${day.duration_min || '—'} min`}
                  </p>
                </div>
              </div>
              {!isRest && (expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />)}
            </button>
            {expanded && !isRest && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex flex-col gap-2.5 mt-3">
                  {day.exercises.map((ex: any, ei: number) => (
                    <div key={ei} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div>
                        <p className="font-heading font-semibold text-sm text-white">{ex.name}</p>
                        <p className="font-heading text-xs" style={{ color: '#64748B' }}>{ex.sets} sets × {ex.reps} · {ex.rest_sec}s rest</p>
                      </div>
                      <span className="font-heading text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                        {ex.muscle_group}
                      </span>
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
