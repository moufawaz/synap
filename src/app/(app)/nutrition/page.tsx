'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Droplets, Flame } from 'lucide-react'
import IonAvatar from '@/components/ui/IonAvatar'

export const dynamic = 'force-dynamic'

export default function NutritionPage() {
  const [plan, setPlan] = useState<any>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [checkedMeals, setCheckedMeals] = useState<Set<number>>(new Set())
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set())
  const [water, setWater] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [planRes, profileRes] = await Promise.all([
      supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
      supabase.from('profiles').select('gender').eq('user_id', user.id).single(),
    ])

    setPlan(planRes.data?.plan_json || null)
    if (profileRes.data?.gender) setGender(profileRes.data.gender as any)
    setLoading(false)
  }

  async function toggleMeal(index: number, meal: any) {
    const next = new Set(checkedMeals)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
      // Log to DB
      await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_name: meal.name,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
        }),
      })
    }
    setCheckedMeals(next)
  }

  const meals = plan?.meals || []
  const eaten = [...checkedMeals]
  const consumedCalories = eaten.reduce((sum, i) => sum + (meals[i]?.calories || 0), 0)
  const consumedProtein = eaten.reduce((sum, i) => sum + (meals[i]?.protein_g || 0), 0)
  const consumedCarbs = eaten.reduce((sum, i) => sum + (meals[i]?.carbs_g || 0), 0)
  const consumedFat = eaten.reduce((sum, i) => sum + (meals[i]?.fat_g || 0), 0)
  const totalCalories = plan?.daily_calories || 1
  const caloriesPct = Math.min((consumedCalories / totalCalories) * 100, 100)

  if (loading) return <LoadingState />
  if (!plan) return <NoPlanState gender={gender} />

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#F97316', letterSpacing: '0.14em' }}>NUTRITION PLAN</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
          Today's Meals
        </h1>
        <p className="font-heading text-sm mt-1" style={{ color: '#475569' }}>
          {plan.daily_calories} kcal • {plan.protein_g}g protein • {plan.approach}
        </p>
      </div>

      {/* Macro Summary */}
      <div className="glass-card p-5 mb-6">
        {/* Calorie ring */}
        <div className="flex items-center gap-5 mb-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke="#F97316" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - caloriesPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-black text-sm text-white">{consumedCalories}</span>
              <span className="font-heading text-[9px]" style={{ color: '#475569' }}>eaten</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-heading text-xs font-bold text-white">Calories</span>
              <span className="font-heading text-xs" style={{ color: '#475569' }}>{consumedCalories} / {plan.daily_calories}</span>
            </div>
            <MacroRow label="Protein" eaten={consumedProtein} total={plan.protein_g} color="#BB5CF6" />
            <MacroRow label="Carbs" eaten={consumedCarbs} total={plan.carbs_g} color="#F97316" />
            <MacroRow label="Fat" eaten={consumedFat} total={plan.fat_g} color="#3B82F6" />
          </div>
        </div>

        {/* Water tracker */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Droplets size={14} style={{ color: '#3B82F6' }} />
            <span className="font-heading text-xs font-semibold text-white">Water</span>
            <span className="font-heading text-xs" style={{ color: '#475569' }}>{water} / {plan.water_l || 3}L</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: plan.water_l || 3 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setWater(i < water ? i : i + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: i < water ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i < water ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <Droplets size={12} style={{ color: i < water ? '#3B82F6' : '#2D3748' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timing note */}
      {plan.meal_timing_note && (
        <div className="px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
          <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
            💡 {plan.meal_timing_note}
          </p>
        </div>
      )}

      {/* Meals */}
      <div className="flex flex-col gap-3">
        {meals.map((meal: any, i: number) => {
          const checked = checkedMeals.has(i)
          const expanded = expandedMeals.has(i)
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: checked ? 'rgba(16,137,129,0.06)' : '#111111',
                border: `1px solid ${checked ? 'rgba(16,137,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleMeal(i, meal)} className="flex-shrink-0 transition-transform active:scale-90">
                  {checked
                    ? <CheckCircle2 size={22} style={{ color: '#108981' }} />
                    : <Circle size={22} style={{ color: '#475569' }} />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.04em' }}>
                      {meal.name}
                    </p>
                    <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                      {meal.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-heading text-xs" style={{ color: checked ? '#108981' : '#475569' }}>
                      <Flame size={10} className="inline mr-0.5" />{meal.calories} kcal
                    </span>
                    <span className="font-heading text-[10px]" style={{ color: '#2D3748' }}>
                      P:{meal.protein_g}g C:{meal.carbs_g}g F:{meal.fat_g}g
                    </span>
                  </div>
                  {meal.description && (
                    <p className="font-heading text-xs mt-0.5 line-clamp-1" style={{ color: '#475569' }}>{meal.description}</p>
                  )}
                </div>
                <button onClick={() => {
                  const next = new Set(expandedMeals)
                  next.has(i) ? next.delete(i) : next.add(i)
                  setExpandedMeals(next)
                }} className="flex-shrink-0 p-1">
                  {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
                </button>
              </div>

              {expanded && meal.foods && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {meal.foods.map((food: any, fi: number) => (
                    <div key={fi} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <p className="font-heading text-xs font-semibold text-white">{food.item}</p>
                        <p className="font-heading text-[10px]" style={{ color: '#475569' }}>{food.amount}</p>
                      </div>
                      <p className="font-heading text-xs font-bold" style={{ color: '#F97316' }}>{food.calories} kcal</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pre/Post workout tips */}
      {(plan.pre_workout || plan.post_workout) && (
        <div className="mt-6 flex flex-col gap-3">
          {plan.pre_workout && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(16,137,129,0.06)', border: '1px solid rgba(16,137,129,0.15)' }}>
              <p className="font-heading font-bold text-xs mb-1" style={{ color: '#108981' }}>PRE-WORKOUT</p>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{plan.pre_workout}</p>
            </div>
          )}
          {plan.post_workout && (
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
              <p className="font-heading font-bold text-xs mb-1" style={{ color: '#BB5CF6' }}>POST-WORKOUT</p>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{plan.post_workout}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MacroRow({ label, eaten, total, color }: { label: string; eaten: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((eaten / total) * 100, 100) : 0
  return (
    <div className="mb-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{label}</span>
        <span className="font-heading text-[10px]" style={{ color: '#475569' }}>{eaten}g / {total}g</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#F97316', borderTopColor: 'transparent' }} />
        <p className="font-heading text-sm" style={{ color: '#475569' }}>Loading nutrition plan...</p>
      </div>
    </div>
  )
}

function NoPlanState({ gender }: { gender: 'male' | 'female' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center">
        <IonAvatar gender={gender} size="lg" />
        <p className="font-heading font-black text-lg text-white mt-4 mb-2 tracking-wider">No plan yet</p>
        <p className="font-heading text-sm mb-4" style={{ color: '#475569' }}>Complete onboarding to get your personalized meal plan.</p>
        <a href="/onboarding" className="btn-primary text-sm w-full flex justify-center">Complete Onboarding</a>
      </div>
    </div>
  )
}
