import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Flame,
  ChevronRight, Zap, Target, Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, workoutRes, dietRes, measurementsRes, workoutLogRes, chatRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
    supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
    supabase.from('measurements').select('weight_kg, date').eq('user_id', user.id).order('date', { ascending: false }).limit(8),
    supabase.from('workout_log').select('logged_at').eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('chat_messages').select('content, role').eq('user_id', user.id).in('role', ['ion', 'assistant']).order('created_at', { ascending: false }).limit(1),
  ])

  const profile = profileRes.data
  const workoutPlan = workoutRes.data?.plan_json as any
  const dietPlan = dietRes.data?.plan_json as any
  const measurements = measurementsRes.data || []
  const weeklyWorkouts = workoutLogRes.data || []
  const lastIonMessage = chatRes.data?.[0]?.content || null

  if (!profile) redirect('/onboarding')

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = days[new Date().getDay()]
  const todayWorkout = workoutPlan?.days?.find((d: any) => d.day_name === todayName)
  const isRestDay = !todayWorkout

  const currentWeight = measurements[0]?.weight_kg
  const prevWeight = measurements[1]?.weight_kg
  const weightDelta = currentWeight && prevWeight ? (currentWeight - prevWeight).toFixed(1) : null

  const totalCalories = dietPlan?.daily_calories || dietPlan?.calories_per_day || 0
  const totalProtein = dietPlan?.macros?.protein_g || dietPlan?.protein_g || 0
  const totalCarbs = dietPlan?.macros?.carbs_g || dietPlan?.carbs_g || 0
  const totalFat = dietPlan?.macros?.fat_g || dietPlan?.fat_g || 0
  const todayMeals = dietPlan?.meals || []

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-4xl mx-auto pb-24 md:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-heading text-sm tracking-widest uppercase mb-1" style={{ color: '#7C3AED', letterSpacing: '0.14em' }}>
            {greeting}
          </p>
          <h1 className="font-heading font-bold text-2xl text-white tracking-wider" style={{ letterSpacing: '0.04em' }}>
            {profile.name}
          </h1>
        </div>
        <Link href="/chat">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <IonAvatar gender={profile.gender} size="sm" />
          </div>
        </Link>
      </div>

      {/* Ion Message Card */}
      {lastIonMessage && (
        <Link href="/chat" className="block mb-6">
          <div className="p-4 rounded-2xl transition-all" style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(34,211,238,0.04))',
            border: '1px solid rgba(124,58,237,0.2)',
          }}>
            <div className="flex items-start gap-3">
              <IonAvatar gender={profile.gender} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles size={11} style={{ color: '#A78BFA' }} />
                  <p className="font-heading font-bold text-xs tracking-wider" style={{ color: '#A78BFA', letterSpacing: '0.1em' }}>ION SAYS</p>
                </div>
                <p className="font-heading text-sm leading-relaxed line-clamp-2" style={{ color: '#CBD5E1' }}>
                  {lastIonMessage}
                </p>
              </div>
              <ChevronRight size={14} style={{ color: '#475569', flexShrink: 0 }} />
            </div>
          </div>
        </Link>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Target size={16} />} label="Goal" value={goalLabel(profile.goal)} color="#7C3AED" />
        <StatCard icon={<Flame size={16} />} label="Calories" value={totalCalories ? `${totalCalories} kcal` : '—'} color="#F59E0B" />
        <StatCard
          icon={<Dumbbell size={16} />}
          label="This Week"
          value={`${weeklyWorkouts.length} / ${profile.training_days || '?'}`}
          color="#22D3EE"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Weight"
          value={currentWeight ? `${currentWeight} kg` : '—'}
          sub={weightDelta ? `${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg` : undefined}
          subColor={weightDelta
            ? (Number(weightDelta) < 0 && profile.goal === 'lose_fat' ? '#10B981'
              : Number(weightDelta) > 0 && profile.goal === 'build_muscle' ? '#10B981' : '#F59E0B')
            : undefined}
          color="#10B981"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* Today's Workout */}
        <Link href="/workout/today">
          <div className="glass-card p-5 transition-all group cursor-pointer h-full" style={{ minHeight: 220 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
                  <Dumbbell size={14} style={{ color: '#22D3EE' }} />
                </div>
                <div>
                  <p className="font-heading font-bold text-xs tracking-wider" style={{ color: '#22D3EE', letterSpacing: '0.1em' }}>TODAY</p>
                  <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.04em' }}>
                    {workoutPlan?.name || 'Workout'}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: '#475569' }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>

            {isRestDay ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="text-3xl">😴</div>
                <p className="font-heading font-bold text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>REST DAY</p>
                <p className="font-heading text-xs" style={{ color: '#475569' }}>Recovery is part of the plan</p>
              </div>
            ) : (
              <div>
                <p className="font-heading font-bold text-xs mb-3" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>
                  {todayWorkout.muscle_focus} • {todayWorkout.duration_min} min
                </p>
                <div className="flex flex-col gap-2">
                  {(todayWorkout.exercises || []).slice(0, 4).map((ex: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="font-heading text-xs text-white font-semibold">{ex.name}</span>
                      <span className="font-heading text-xs" style={{ color: '#475569' }}>{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                  {(todayWorkout.exercises || []).length > 4 && (
                    <p className="font-heading text-xs text-center" style={{ color: '#475569' }}>
                      +{todayWorkout.exercises.length - 4} more exercises
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Today's Nutrition */}
        <Link href="/nutrition">
          <div className="glass-card p-5 transition-all group cursor-pointer h-full" style={{ minHeight: 220 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <UtensilsCrossed size={14} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p className="font-heading font-bold text-xs tracking-wider" style={{ color: '#F59E0B', letterSpacing: '0.1em' }}>NUTRITION</p>
                  <p className="font-heading font-bold text-sm text-white" style={{ letterSpacing: '0.04em' }}>
                    {totalCalories ? `${totalCalories} kcal` : 'Diet Plan'}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: '#475569' }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <MacroBar label="Protein" value={totalProtein} max={totalProtein || 100} color="#7C3AED" unit="g" />
              <MacroBar label="Carbs" value={totalCarbs} max={totalCarbs || 100} color="#F59E0B" unit="g" />
              <MacroBar label="Fat" value={totalFat} max={totalFat || 100} color="#22D3EE" unit="g" />
            </div>

            <div className="flex flex-col gap-1.5">
              {todayMeals.slice(0, 3).map((meal: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="font-heading text-xs text-white font-semibold">{meal.meal_name || meal.name}</span>
                  <span className="font-heading text-xs" style={{ color: '#475569' }}>{meal.calories} kcal</span>
                </div>
              ))}
              {todayMeals.length > 3 && (
                <p className="font-heading text-xs text-center" style={{ color: '#475569' }}>+{todayMeals.length - 3} more meals</p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Weight Chart */}
      {measurements.length > 1 && (
        <div className="mt-5">
          <Link href="/progress">
            <div className="glass-card p-5 group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                    <TrendingUp size={14} style={{ color: '#A78BFA' }} />
                  </div>
                  <p className="font-heading font-bold text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>WEIGHT TREND</p>
                </div>
                <ChevronRight size={14} style={{ color: '#475569' }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <WeightMiniChart measurements={measurements} goal={profile.goal} />
            </div>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <QuickAction href="/chat" icon={<Zap size={18} />} label="Ask Ion" color="#7C3AED" />
        <QuickAction href="/measurements" icon={<TrendingUp size={18} />} label="Log Weight" color="#10B981" />
        <QuickAction href="/workout/today" icon={<Dumbbell size={18} />} label="Start Training" color="#22D3EE" />
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, subColor }: {
  icon: React.ReactNode; label: string; value: string
  sub?: string; color: string; subColor?: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
        <span className="font-heading text-[10px] tracking-widest uppercase" style={{ color: '#475569', letterSpacing: '0.12em' }}>{label}</span>
      </div>
      <p className="font-heading font-bold text-base text-white">{value}</p>
      {sub && <p className="font-heading text-xs mt-0.5 font-semibold" style={{ color: subColor || '#475569' }}>{sub}</p>}
    </div>
  )
}

function MacroBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-heading text-xs" style={{ color: '#64748B' }}>{label}</span>
        <span className="font-heading text-xs font-semibold text-white">{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function WeightMiniChart({ measurements, goal }: { measurements: any[]; goal: string }) {
  const weights = [...measurements].reverse().map(m => m.weight_kg).filter(Boolean)
  if (weights.length < 2) return null

  const min = Math.min(...weights) - 1
  const max = Math.max(...weights) + 1
  const range = max - min || 1
  const W = 300; const H = 60

  const pts = weights.map((w, i) => `${(i / (weights.length - 1)) * W},${H - ((w - min) / range) * H}`).join(' ')
  const trendDown = weights[weights.length - 1] < weights[0]
  const lineColor = (goal === 'lose_fat' && trendDown) || (goal === 'build_muscle' && !trendDown) ? '#10B981' : '#7C3AED'

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`${pts} ${W},${H} 0,${H}`} fill="url(#wg2)" stroke="none" />
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {weights.map((w, i) => (
          <circle key={i} cx={(i / (weights.length - 1)) * W} cy={H - ((w - min) / range) * H} r="3" fill={lineColor} stroke="#0D0D1A" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="font-heading text-xs" style={{ color: '#475569' }}>{weights[0]} kg</span>
        <span className="font-heading text-xs font-bold" style={{ color: lineColor }}>{weights[weights.length - 1]} kg</span>
      </div>
    </div>
  )
}

function QuickAction({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}>
      <div className="glass-card p-3 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform text-center">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30`, color }}>
          {icon}
        </div>
        <span className="font-heading text-[10px] font-bold tracking-widest text-white" style={{ letterSpacing: '0.1em' }}>
          {label.toUpperCase()}
        </span>
      </div>
    </Link>
  )
}

function goalLabel(goal: string): string {
  return ({ lose_fat: 'Lose Fat', build_muscle: 'Build Muscle', recomposition: 'Recomp', improve_fitness: 'Fitness', be_healthier: 'Health' })[goal] || goal
}
