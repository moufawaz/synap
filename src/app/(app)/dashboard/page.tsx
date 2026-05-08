import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  Dumbbell, UtensilsCrossed, TrendingUp, Flame,
  ChevronRight, Zap, Target, Sparkles, Shield, Crown, FileText,
} from 'lucide-react'
import { getTrialDaysRemaining, effectivePlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

const C = {
  spark:       '#BB5CF6',
  sparkLight:  '#D88BFF',
  sparkDeep:   '#7B2FFF',
  pulse:       '#108981',
  flame:       '#F97316',
  alert:       '#F59E0B',
  danger:      '#EF4444',
  silver:      '#E2E8F0',
  silverMuted: '#94A3B8',
  silverDim:   '#64748B',
  silverDeep:  '#475569',
  void:        '#0A0A0A',
  voidCard:    '#0E0E0E',
  voidRim:     '#1A1A1A',
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, workoutRes, dietRes, measurementsRes, workoutLogRes, chatRes, subRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('workout_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
    supabase.from('diet_plans').select('plan_json').eq('user_id', user.id).eq('active', true).single(),
    supabase.from('measurements').select('weight_kg, date').eq('user_id', user.id).order('date', { ascending: false }).limit(8),
    supabase.from('workout_log').select('logged_at').eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('chat_messages').select('content, role').eq('user_id', user.id).in('role', ['ion', 'assistant']).order('created_at', { ascending: false }).limit(1),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
  ])

  const profile = profileRes.data
  const workoutPlan = workoutRes.data?.plan_json as any
  const dietPlan = dietRes.data?.plan_json as any
  const measurements = measurementsRes.data || []
  const weeklyWorkouts = workoutLogRes.data || []
  const lastIonMessage = chatRes.data?.[0]?.content || null
  const subscription = subRes.data

  if (!profile) redirect('/onboarding')

  const isRTL = profile.language === 'ar'
  const isLaunchMode = process.env.LAUNCH_MODE === 'true'
  const plan = effectivePlan(subscription)
  const isTrial = subscription?.status === 'trial'
  const trialDaysLeft = getTrialDaysRemaining(subscription)
  const isStarter = plan === 'starter' && !isLaunchMode
  const isElite = plan === 'elite'
  // legacy compat
  const isFree = isStarter

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
  const greeting = isRTL
    ? (greetingHour < 12 ? 'صباح الخير' : greetingHour < 17 ? 'مساء الخير' : 'مساء الخير')
    : (greetingHour < 12 ? 'GOOD MORNING' : greetingHour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING')
  const hasInbody = !!profile?.inbody_url

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-4xl mx-auto pb-24 md:pb-6 relative" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Ambient hero glow */}
      <div
        aria-hidden
        className="absolute -top-20 -left-10 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(187,92,246,0.10), transparent 60%)', filter: 'blur(60px)' }}
      />

      {isLaunchMode && (
        <Banner color={C.pulse} icon={<Zap size={14} />} bg="rgba(16,137,129,0.06)" border="rgba(16,137,129,0.2)">
          <p className="font-heading text-xs" style={{ color: C.pulse }}>
            {isRTL ? <><strong>وصول الإطلاق:</strong> كل الميزات مفتوحة مجاناً أثناء فترة الإطلاق.</> : <><strong>LAUNCH SPECIAL:</strong> All features unlocked for free during launch.</>}
          </p>
        </Banner>
      )}

      {isTrial && trialDaysLeft !== null && !isLaunchMode && (
        <Link href="/settings?tab=billing">
          <div
            className="mb-5 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:opacity-90"
            style={{
              background:
                trialDaysLeft <= 1 ? 'rgba(239,68,68,0.08)' :
                trialDaysLeft <= 2 ? 'rgba(245,158,11,0.08)' :
                'rgba(187,92,246,0.08)',
              border: `1px solid ${
                trialDaysLeft <= 1 ? 'rgba(239,68,68,0.22)' :
                trialDaysLeft <= 2 ? 'rgba(245,158,11,0.22)' :
                'rgba(187,92,246,0.22)'
              }`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Shield size={14} style={{ color: trialDaysLeft <= 1 ? C.danger : trialDaysLeft <= 2 ? C.alert : C.spark }} />
              <div>
                <p className="font-heading font-bold text-xs text-white tracking-wider">
                  {isRTL ? `التجربة المجانية - متبقي ${trialDaysLeft} يوم` : `FREE TRIAL - ${trialDaysLeft} DAY${trialDaysLeft !== 1 ? 'S' : ''} LEFT`}
                </p>
                <p className="font-heading text-[10px] mt-0.5" style={{ color: C.silverDim }}>
                  {isRTL ? 'الإلغاء قبل اليوم السابع يعني بدون أي رسوم. اضغط لإدارة الفوترة.' : 'Cancel before day 7 = zero charges. Tap to manage billing.'}
                </p>
              </div>
            </div>
            <ChevronRight size={12} style={{ color: C.silverDeep, flexShrink: 0 }} />
          </div>
        </Link>
      )}

      {!hasInbody && (
        <Link href="/measurements">
          <div
            className="mb-5 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={14} style={{ color: C.alert }} />
              <div>
                <p className="font-heading font-bold text-xs text-white tracking-wider">{isRTL ? 'أضف فحص InBody' : 'ADD YOUR INBODY SCAN'}</p>
                <p className="font-heading text-[10px] mt-0.5" style={{ color: C.silverDim }}>
                  {isRTL ? 'افتح أهداف سعرات وبروتين أدق من Ion.' : 'Unlock more accurate calorie & protein targets from Ion.'}
                </p>
              </div>
            </div>
            <span
              className="font-heading font-bold text-[10px] px-2.5 py-1 rounded-lg shrink-0 tracking-widest"
              style={{ background: 'rgba(245,158,11,0.1)', color: C.alert, border: '1px solid rgba(245,158,11,0.22)' }}
            >
              {isRTL ? 'إضافة' : 'ADD'}
            </span>
          </div>
        </Link>
      )}

      {isStarter && (
        <Link href="/pricing">
          <div
            className="mb-5 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.18)' }}
          >
            <div className="flex items-center gap-2.5">
              <Crown size={14} style={{ color: C.spark }} />
              <div>
                <p className="font-heading font-bold text-xs text-white tracking-wider">{isRTL ? 'أنت على خطة Starter' : 'YOU\'RE ON THE STARTER PLAN'}</p>
                <p className="font-heading text-[10px] mt-0.5" style={{ color: C.silverDim }}>
                  {isRTL ? '5 رسائل يومياً لمدة 7 أيام، ثم تتوقف. ارفع إلى Pro أو Elite للرسائل غير المحدودة.' : '5 messages/day for 7 days, then pause. Upgrade to Pro or Elite for unlimited.'}
                </p>
              </div>
            </div>
            <span
              className="font-heading font-black text-[10px] px-3 py-1.5 rounded-lg shrink-0"
              style={{
                background: C.spark,
                color: 'white',
                letterSpacing: '0.12em',
                boxShadow: '0 0 12px rgba(187,92,246,0.4)',
              }}
            >
              {isRTL ? 'ترقية' : 'UPGRADE'}
            </span>
          </div>
        </Link>
      )}

      {isElite && !isLaunchMode && (
        <div
          className="mb-5 p-3 rounded-2xl flex items-center gap-2.5"
          style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}
        >
          <Crown size={13} style={{ color: C.spark }} />
          <p className="font-heading text-xs font-semibold" style={{ color: C.sparkLight }}>
            {isRTL ? 'عضوية Elite فعالة - التقارير الأسبوعية والمكملات وتوقعات الهدف مفعلة' : 'Elite member - weekly reports, supplement stack & goal predictions active'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 relative">
        <div>
          <p
            className="font-heading text-xs uppercase mb-1"
            style={{ color: C.spark, letterSpacing: '0.18em', fontWeight: 600 }}
          >
            {greeting}
          </p>
          <h1
            className="font-heading font-bold text-3xl text-white"
            style={{ letterSpacing: '0.02em' }}
          >
            {profile.name}
          </h1>
        </div>
        <Link href="/chat">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: 'rgba(187,92,246,0.08)',
              border: '1px solid rgba(187,92,246,0.22)',
              boxShadow: '0 0 16px rgba(187,92,246,0.15)',
            }}
          >
            <IonAvatar gender={profile.gender} size="sm" showStatus={false} />
          </div>
        </Link>
      </div>

      {lastIonMessage && (
        <Link href="/chat" className="block mb-6">
          <div
            className="p-4 rounded-2xl transition-all hover:translate-y-[-1px] gradient-border"
            style={{
              background:
                'linear-gradient(135deg, rgba(187,92,246,0.10), rgba(123,47,255,0.04))',
            }}
          >
            <div className="flex items-start gap-3">
              <IonAvatar gender={profile.gender} size="sm" showStatus={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={11} style={{ color: C.sparkLight }} />
                  <p
                    className="font-heading font-bold text-[11px]"
                    style={{ color: C.sparkLight, letterSpacing: '0.18em' }}
                  >
                    {isRTL ? 'ION يقول' : 'ION SAYS'}
                  </p>
                </div>
                <p className="font-heading text-sm leading-relaxed line-clamp-2" style={{ color: '#CBD5E1' }}>
                  {lastIonMessage}
                </p>
              </div>
              <ChevronRight size={14} style={{ color: C.silverDeep, flexShrink: 0 }} />
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Target size={16} />} label={isRTL ? 'الهدف' : 'GOAL'} value={goalLabel(profile.goal, isRTL)} color={C.spark} />
        <StatCard icon={<Flame size={16} />}  label={isRTL ? 'السعرات' : 'CALORIES'}  value={totalCalories ? `${totalCalories} kcal` : '-'}  color={C.flame} />
        <StatCard
          icon={<Dumbbell size={16} />}
          label={isRTL ? 'هذا الأسبوع' : 'THIS WEEK'}
          value={`${weeklyWorkouts.length} / ${profile.training_days || '?'}`}
          color={C.sparkLight}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label={isRTL ? 'الوزن' : 'WEIGHT'}
          value={currentWeight ? `${currentWeight} kg` : '-'}
          sub={weightDelta ? `${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg` : undefined}
          subColor={
            weightDelta
              ? (Number(weightDelta) < 0 && profile.goal === 'lose_fat' ? C.pulse
                : Number(weightDelta) > 0 && profile.goal === 'build_muscle' ? C.pulse : C.alert)
              : undefined
          }
          color={C.pulse}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* Today's Workout */}
        <Link href="/workout/today">
          <div className="glass-card glass-card-hover p-5 cursor-pointer h-full group" style={{ minHeight: 220 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBadge color={C.spark} icon={<Dumbbell size={14} />} />
                <div>
                  <p className="font-heading font-bold text-[11px]" style={{ color: C.sparkLight, letterSpacing: '0.18em' }}>{isRTL ? 'اليوم' : 'TODAY'}</p>
                  <p className="font-heading font-bold text-sm text-white" style={{ letterSpacing: '0.04em' }}>
                    {workoutPlan?.name || (isRTL ? 'التمرين' : 'Workout')}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: C.silverDeep }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>

            {isRestDay ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="text-3xl">{isRTL ? 'راحة' : 'REST'}</div>
                <p className="font-heading font-bold text-white" style={{ letterSpacing: '0.14em' }}>{isRTL ? 'يوم راحة' : 'REST DAY'}</p>
                <p className="font-heading text-xs" style={{ color: C.silverDeep }}>{isRTL ? 'الاستشفاء جزء من الخطة' : 'Recovery is part of the plan'}</p>
              </div>
            ) : (
              <div>
                <p className="font-heading font-bold text-[11px] mb-3 uppercase" style={{ color: C.silverMuted, letterSpacing: '0.12em' }}>
                  {todayWorkout.muscle_focus} - {todayWorkout.duration_min} min
                </p>
                <div className="flex flex-col gap-2">
                  {(todayWorkout.exercises || []).slice(0, 4).map((ex: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <span className="font-heading text-xs text-white font-semibold">{ex.name}</span>
                      <span className="font-mono text-xs" style={{ color: C.sparkLight }}>{ex.sets}x{ex.reps}</span>
                    </div>
                  ))}
                  {(todayWorkout.exercises || []).length > 4 && (
                    <p className="font-heading text-xs text-center" style={{ color: C.silverDeep }}>
                      {isRTL ? `${todayWorkout.exercises.length - 4}+ تمارين إضافية` : `+${todayWorkout.exercises.length - 4} more exercises`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Today's Nutrition */}
        <Link href="/nutrition">
          <div className="glass-card glass-card-hover p-5 cursor-pointer h-full group" style={{ minHeight: 220 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBadge color={C.flame} icon={<UtensilsCrossed size={14} />} />
                <div>
                  <p className="font-heading font-bold text-[11px]" style={{ color: C.flame, letterSpacing: '0.18em' }}>{isRTL ? 'التغذية' : 'NUTRITION'}</p>
                  <p className="font-heading font-bold text-sm text-white" style={{ letterSpacing: '0.04em' }}>
                    {totalCalories ? `${totalCalories} kcal` : (isRTL ? 'خطة التغذية' : 'Diet Plan')}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: C.silverDeep }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <MacroBar label={isRTL ? 'البروتين' : 'PROTEIN'} value={totalProtein} max={totalProtein || 100} color={C.spark}      unit="g" />
              <MacroBar label={isRTL ? 'الكارب' : 'CARBS'}   value={totalCarbs}   max={totalCarbs   || 100} color={C.flame}      unit="g" />
              <MacroBar label={isRTL ? 'الدهون' : 'FAT'}     value={totalFat}     max={totalFat     || 100} color={C.sparkLight} unit="g" />
            </div>

            <div className="flex flex-col gap-1.5">
              {todayMeals.slice(0, 3).map((meal: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="font-heading text-xs text-white font-semibold">{meal.meal_name || meal.name}</span>
                  <span className="font-mono text-xs" style={{ color: C.silverMuted }}>{meal.calories} kcal</span>
                </div>
              ))}
              {todayMeals.length > 3 && (
                <p className="font-heading text-xs text-center" style={{ color: C.silverDeep }}>
                  {isRTL ? `${todayMeals.length - 3}+ وجبات إضافية` : `+${todayMeals.length - 3} more meals`}
                </p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {measurements.length > 1 && (
        <div className="mt-5">
          <Link href="/progress">
            <div className="glass-card glass-card-hover p-5 group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <IconBadge color={C.spark} icon={<TrendingUp size={14} />} />
                  <p className="font-heading font-bold text-sm text-white" style={{ letterSpacing: '0.14em' }}>
                    {isRTL ? 'اتجاه الوزن' : 'WEIGHT TREND'}
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: C.silverDeep }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <WeightMiniChart measurements={measurements} goal={profile.goal} />
            </div>
          </Link>
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <QuickAction href="/chat"          icon={<Zap size={18} />}        label={isRTL ? 'اسأل ION' : 'ASK ION'}        color={C.spark} />
        <QuickAction href="/measurements"  icon={<TrendingUp size={18} />} label={isRTL ? 'سجل الوزن' : 'LOG WEIGHT'}     color={C.pulse} />
        <QuickAction href="/workout/today" icon={<Dumbbell size={18} />}   label={isRTL ? 'ابدأ التمرين' : 'START TRAINING'} color={C.flame} />
      </div>
    </div>
  )
}

// Sub-components

function Banner({
  color, icon, bg, border, children,
}: { color: string; icon: React.ReactNode; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 p-3.5 rounded-2xl flex items-center gap-3" style={{ background: bg, border: `1px solid ${border}` }}>
      <div style={{ color }}>{icon}</div>
      {children}
    </div>
  )
}

function IconBadge({ color, icon }: { color: string; icon: React.ReactNode }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{
        background: `${color}1A`,
        border: `1px solid ${color}40`,
        color,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 12px ${color}20`,
      }}
    >
      {icon}
    </div>
  )
}

function StatCard({
  icon, label, value, sub, color, subColor,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string; subColor?: string }) {
  return (
    <div className="glass-card p-4 relative overflow-hidden">
      {/* Subtle color rim */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-30"
        style={{ background: `radial-gradient(120% 60% at 100% 0%, ${color}18, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div style={{ color, opacity: 0.85 }}>{icon}</div>
          <span className="font-heading text-[10px] uppercase" style={{ color: '#475569', letterSpacing: '0.18em', fontWeight: 600 }}>
            {label}
          </span>
        </div>
        <p className="font-heading font-bold text-base text-white">{value}</p>
        {sub && (
          <p className="font-mono text-xs mt-0.5 font-semibold" style={{ color: subColor || '#475569' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

function MacroBar({
  label, value, max, color, unit,
}: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-heading text-[10px]" style={{ color: '#64748B', letterSpacing: '0.16em', fontWeight: 600 }}>
          {label}
        </span>
        <span className="font-mono text-xs font-semibold text-white">
          {value}{unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}DD)`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
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
  const goodTrend = (goal === 'lose_fat' && trendDown) || (goal === 'build_muscle' && !trendDown)
  const lineColor = goodTrend ? '#108981' : '#BB5CF6'

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`${pts} ${W},${H} 0,${H}`} fill="url(#wg2)" stroke="none" />
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {weights.map((w, i) => (
          <circle
            key={i}
            cx={(i / (weights.length - 1)) * W}
            cy={H - ((w - min) / range) * H}
            r="3"
            fill={lineColor}
            stroke="#0E0E0E"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="font-mono text-xs" style={{ color: '#475569' }}>{weights[0]} kg</span>
        <span className="font-mono text-xs font-bold" style={{ color: lineColor }}>
          {weights[weights.length - 1]} kg
        </span>
      </div>
    </div>
  )
}

function QuickAction({
  href, icon, label, color,
}: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}>
      <div className="glass-card p-3 flex flex-col items-center gap-2 cursor-pointer hover:scale-[1.03] transition-transform text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
            color,
            boxShadow: `0 0 14px ${color}25`,
          }}
        >
          {icon}
        </div>
        <span
          className="font-heading text-[10px] font-bold text-white"
          style={{ letterSpacing: '0.16em' }}
        >
          {label}
        </span>
      </div>
    </Link>
  )
}

function goalLabel(goal: string, isRTL = false): string {
  const en = {
    lose_fat: 'Lose Fat',
    build_muscle: 'Build Muscle',
    recomposition: 'Recomp',
    improve_fitness: 'Fitness',
    be_healthier: 'Health',
  } as Record<string, string>
  const ar = {
    lose_fat: 'خسارة الدهون',
    build_muscle: 'بناء العضلات',
    recomposition: 'إعادة تركيب',
    improve_fitness: 'لياقة أفضل',
    be_healthier: 'صحة أفضل',
  } as Record<string, string>
  return (isRTL ? ar : en)[goal] || goal
}
