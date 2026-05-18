'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { Save, LogOut, Globe, User, Dumbbell, CreditCard, Shield, ChevronRight, AlertTriangle, Infinity as InfinityIcon, Zap, Crown, Utensils, Heart, Upload, Activity, RefreshCw, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/useLanguage'
import { t } from '@/lib/i18n'
import { clearSessionPersistenceFlags } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const router = useRouter()
  const { lang, setLang: setAppLang } = useLanguage()
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelResult, setCancelResult] = useState<string | null>(null)
  const [localizingArabic, setLocalizingArabic] = useState(false)
  const [localizeResult, setLocalizeResult] = useState<string | null>(null)
  const [inbodyAnalyzing, setInbodyAnalyzing] = useState(false)
  const [inbodyError, setInbodyError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [inbodySuccess, setInbodySuccess] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'billing') setActiveSection('billing')
    loadData()
  }, [])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const [profileRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    ])
    setProfile(profileRes.data || {})
    let sub = subRes.data || null
    if (!sub && profileRes.data?.trial_ends_at && new Date(profileRes.data.trial_ends_at) > new Date()) {
      sub = { status: 'free_trial', plan_type: 'elite', trial_ends_at: profileRes.data.trial_ends_at, _is_free_trial: true }
    }
    setSubscription(sub)
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    const supabase = createBrowserClient()
    await supabase.from('profiles').update(profile).eq('user_id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    clearSessionPersistenceFlags()
    router.push('/')
    router.refresh()
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { setDeleteError(json.error || 'Failed to delete account.'); setDeleteLoading(false); return }
      // Account deleted — sign out locally and redirect
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      clearSessionPersistenceFlags()
      router.push('/?account_deleted=1')
      router.refresh()
    } catch {
      setDeleteError('Unexpected error. Please try again.')
      setDeleteLoading(false)
    }
  }

  async function handleCancel() {
    if (!cancelConfirm) {
      setCancelConfirm(true)
      return
    }
    setCancelLoading(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setCancelResult(data.message)
        setCancelConfirm(false)
        await loadData() // refresh subscription
      } else {
        setCancelResult(data.error || 'Something went wrong.')
      }
    } catch {
      setCancelResult('Network error. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  function updateProfile(key: string, value: any) {
    setProfile((prev: any) => ({ ...prev, [key]: value }))
  }

  async function localizeSavedArabicContent() {
    setLocalizingArabic(true)
    setLocalizeResult(null)
    try {
      const res = await fetch('/api/localize-content', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not translate saved content.')
      const translated = data.result || {}
      setLocalizeResult(
        lang === 'ar'
          ? `تم تحديث المحتوى المحفوظ: الخطط ${translated.diet_plan || translated.workout_plan ? 'جاهزة' : 'لم تتغير'}، والرسائل ${translated.messages || 0}.`
          : `Saved content updated: plans ${translated.diet_plan || translated.workout_plan ? 'translated' : 'unchanged'}, messages ${translated.messages || 0}.`
      )
      await loadData()
    } catch (err: any) {
      setLocalizeResult(err?.message || (lang === 'ar' ? 'تعذر تحديث المحتوى.' : 'Could not update saved content.'))
    } finally {
      setLocalizingArabic(false)
    }
  }

  async function handleInbodyUpload(file: File) {
    if (!user || !file) return
    setInbodyAnalyzing(true)
    setInbodyError(null)
    setInbodySuccess(null)
    try {
      const supabase = createBrowserClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('inbody-scans').upload(path, file, { upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: { publicUrl } } = supabase.storage.from('inbody-scans').getPublicUrl(path)
      const res = await fetch('/api/analyze-inbody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inbody_url: publicUrl }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed')
      const d = data.data
      const inbodyUpdate: Record<string, any> = {}
      if (d.body_fat_pct   != null) inbodyUpdate.body_fat_pct   = d.body_fat_pct
      if (d.muscle_mass_kg != null) inbodyUpdate.muscle_mass_kg = d.muscle_mass_kg
      if (d.bmr_kcal       != null) inbodyUpdate.bmr_kcal       = d.bmr_kcal
      if (d.visceral_fat   != null) inbodyUpdate.visceral_fat   = d.visceral_fat
      if (d.inbody_score   != null) inbodyUpdate.inbody_score   = d.inbody_score
      // Persist inbody_url immediately — don't wait for the user to hit Save
      try {
        await supabase.from('profiles').update({ ...inbodyUpdate, inbody_url: publicUrl }).eq('user_id', user.id)
      } catch { /* non-fatal — analyzed data was already saved by the API */ }
      // Sync local state so the display updates instantly
      setProfile((prev: any) => ({ ...prev, ...inbodyUpdate, inbody_url: publicUrl }))
      setInbodySuccess(d.coaching_summary || (lang === 'ar' ? 'تم تحليل المسح بنجاح' : 'Scan analysed successfully'))
    } catch (err: any) {
      setInbodyError(err?.message || (lang === 'ar' ? 'فشل تحليل المسح' : 'Scan analysis failed'))
    } finally {
      setInbodyAnalyzing(false)
    }
  }

  const isLaunchMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'

  const SECTIONS = [
    { id: 'profile',     label: t(lang, 'settings_profile'),     icon: User },
    { id: 'training',    label: t(lang, 'settings_training'),    icon: Dumbbell },
    { id: 'nutrition',   label: lang === 'ar' ? 'التغذية'       : 'Nutrition',  icon: Utensils },
    { id: 'health',      label: lang === 'ar' ? 'الصحة'          : 'Health',     icon: Heart },
    { id: 'preferences', label: t(lang, 'settings_preferences'), icon: Globe },
    { id: 'billing',     label: t(lang, 'settings_billing'),     icon: CreditCard },
    { id: 'integrations',label: 'Integrations',                  icon: Zap },
  ]

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  // ── Subscription state helpers ─────────────────────────
  const sub = subscription
  const status = sub?.status || 'starter'
  const rawPlanName = (sub?.plan_type || sub?.plan_name || 'starter').toLowerCase()
  const isTrial = status === 'trial' || status === 'free_trial'
  const isFreeTrial = status === 'free_trial'
  const isActive = status === 'active'
  const isCancelled = status === 'cancelled'

  const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null

  const periodEnd = sub?.current_period_ends_at ? new Date(sub.current_period_ends_at) : null

  // Cancelled with no period end (or period already passed) = effectively Starter
  const cancelledAndExpired = isCancelled && (!periodEnd || periodEnd <= new Date())
  const isStarter = !sub || status === 'starter' || status === 'free' || status === 'expired' || cancelledAndExpired
  // legacy compat
  const isFree = isStarter

  // Map raw plan names to display labels
  // isStarter covers all "effectively free" states: no sub, status=starter/free/expired, cancelled+expired
  const planLabel = isFreeTrial ? 'Elite'
    : isStarter ? 'Starter'
    : rawPlanName === 'elite' ? 'Elite'
    : rawPlanName === 'pro' || rawPlanName === 'unlimited' ? 'Pro'
    : 'Starter'
  const planName = isStarter ? 'starter' : rawPlanName

  const billingLabel = isStarter ? '' : sub?.billing_period === 'annual' ? 'Annual' : sub?.billing_period === 'monthly' ? 'Monthly' : ''
  const canCancel = (isTrial || isActive) && sub?.lemon_squeezy_subscription_id

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>{t(lang, 'settings_account_label')}</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>{t(lang, 'settings_title')}</h1>
      </div>

      {/* Avatar + email */}
      <div className="glass-card p-5 mb-6 flex items-center gap-4">
        <IonAvatar gender={profile.gender || 'male'} size="lg" />
        <div>
          <p className="font-heading font-black text-lg text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
            {profile.name || 'Athlete'}
          </p>
          <p className="font-heading text-sm" style={{ color: '#475569' }}>{user?.email}</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="flex items-center gap-2 px-4 rounded-xl font-heading text-xs font-semibold tracking-wider transition-all"
            style={{
              minHeight: '44px',
              background: activeSection === s.id ? 'rgba(187,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeSection === s.id ? 'rgba(187,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: activeSection === s.id ? '#BB5CF6' : '#475569',
            }}
          >
            <s.icon size={12} />
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Profile ────────────────────────────────────────── */}
      {activeSection === 'profile' && (
        <div className="flex flex-col gap-4">
          {/* Personal info */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{t(lang, 'settings_personal_info')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t(lang, 'settings_name')} value={profile.name || ''} onChange={v => updateProfile('name', v)} />
              <Field label={t(lang, 'settings_age')} value={String(profile.age || '')} onChange={v => updateProfile('age', parseInt(v) || v)} type="number" />
              <Field label={t(lang, 'settings_weight')} value={String(profile.weight_kg || '')} onChange={v => updateProfile('weight_kg', parseFloat(v) || v)} type="number" />
              <Field label={t(lang, 'settings_height')} value={String(profile.height_cm || '')} onChange={v => updateProfile('height_cm', parseFloat(v) || v)} type="number" />
              <SelectField label={t(lang, 'settings_gender')} value={profile.gender || 'male'} onChange={v => updateProfile('gender', v)}
                options={[{ value: 'male', label: t(lang, 'settings_gender_male') }, { value: 'female', label: t(lang, 'settings_gender_female') }]} />
            </div>
          </div>
          {/* Goal details */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{lang === 'ar' ? 'الهدف' : 'YOUR GOAL'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label={t(lang, 'settings_goal')} value={profile.goal || ''} onChange={v => updateProfile('goal', v)}
                options={[
                  { value: 'lose_fat',       label: t(lang, 'settings_goal_lose_fat') },
                  { value: 'build_muscle',   label: t(lang, 'settings_goal_build_muscle') },
                  { value: 'recomposition',  label: t(lang, 'settings_goal_recomp') },
                  { value: 'improve_fitness',label: t(lang, 'settings_goal_fitness') },
                  { value: 'be_healthier',   label: t(lang, 'settings_goal_healthier') },
                ]} />
              <SelectField
                label={lang === 'ar' ? 'سرعة الوصول للهدف' : 'Goal Speed'}
                value={profile.goal_speed || 'moderate'}
                onChange={v => updateProfile('goal_speed', v)}
                options={[
                  { value: 'slow',       label: lang === 'ar' ? 'بطيء وثابت'          : 'Slow & Steady' },
                  { value: 'moderate',   label: lang === 'ar' ? 'معتدل (مُنصح به)'     : 'Moderate (Recommended)' },
                  { value: 'aggressive', label: lang === 'ar' ? 'سريع (أكثر صرامة)'   : 'Aggressive (Stricter)' },
                ]}
              />
              <Field
                label={lang === 'ar' ? 'الهدف المحدد (مثل: 80 كجم)' : 'Specific Target (e.g. 80 kg, 15% BF)'}
                value={profile.goal_target || ''}
                onChange={v => updateProfile('goal_target', v)}
              />
              <Field
                label={lang === 'ar' ? 'الموعد النهائي للهدف' : 'Goal Deadline'}
                value={profile.goal_date || ''}
                onChange={v => updateProfile('goal_date', v)}
                type="date"
              />
            </div>
          </div>
          {/* Schedule */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{lang === 'ar' ? 'الجدول اليومي' : 'DAILY SCHEDULE'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={lang === 'ar' ? 'وقت الاستيقاظ' : 'Wake Time'} value={profile.wake_time || ''} onChange={v => updateProfile('wake_time', v)} type="time" />
              <Field label={lang === 'ar' ? 'وقت النوم' : 'Sleep Time'} value={profile.sleep_time || ''} onChange={v => updateProfile('sleep_time', v)} type="time" />
              <SelectField
                label={lang === 'ar' ? 'نوع جدول العمل' : 'Work Schedule'}
                value={profile.work_schedule || 'work'}
                onChange={v => updateProfile('work_schedule', v)}
                options={[
                  { value: 'work',     label: lang === 'ar' ? 'دوام كامل'   : 'Full-time work' },
                  { value: 'student',  label: lang === 'ar' ? 'طالب'        : 'Student' },
                  { value: 'flexible', label: lang === 'ar' ? 'جدول مرن'    : 'Flexible schedule' },
                  { value: 'shifts',   label: lang === 'ar' ? 'دوام بالورديات' : 'Shift work' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Training ────────────────────────────────────────── */}
      {activeSection === 'training' && (
        <div className="flex flex-col gap-4">
          {/* Training schedule */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{t(lang, 'settings_training_prefs')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label={t(lang, 'settings_training_days')} value={String(profile.training_days || '3')} onChange={v => updateProfile('training_days', parseInt(v))}
                options={['2','3','4','5','6'].map(v => ({ value: v, label: `${v} ${t(lang, 'settings_days_suffix')}` }))} />
              <SelectField label={t(lang, 'settings_session_duration')} value={String(profile.session_duration || '60')} onChange={v => updateProfile('session_duration', parseInt(v))}
                options={[
                  { value: '30', label: t(lang, 'settings_min_30') },
                  { value: '45', label: t(lang, 'settings_min_45') },
                  { value: '60', label: t(lang, 'settings_hour_1') },
                  { value: '90', label: t(lang, 'settings_min_90') },
                ]} />
              <SelectField label={t(lang, 'settings_gym_access')} value={profile.gym_access ? 'true' : 'false'} onChange={v => updateProfile('gym_access', v === 'true')}
                options={[{ value: 'true', label: t(lang, 'settings_gym') }, { value: 'false', label: t(lang, 'settings_home') }]} />
              <SelectField label={t(lang, 'settings_training_time')} value={profile.training_time || 'morning'} onChange={v => updateProfile('training_time', v)}
                options={[
                  { value: 'morning',    label: t(lang, 'settings_morning') },
                  { value: 'afternoon',  label: t(lang, 'settings_afternoon') },
                  { value: 'evening',    label: t(lang, 'settings_evening') },
                  { value: 'late_night', label: t(lang, 'settings_late_night') },
                ]} />
            </div>
          </div>

          {/* Home equipment — shown only for home trainers */}
          {!profile.gym_access && (
            <div className="glass-card p-5">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
                {lang === 'ar' ? 'الأجهزة المتاحة في المنزل' : 'HOME EQUIPMENT'}
              </p>
              <p className="font-heading text-xs mb-4" style={{ color: '#475569' }}>
                {lang === 'ar' ? 'Ion يستخدم هذا لبناء تمارينك' : 'Ion uses this to build your workouts'}
              </p>
              <CheckboxGroup
                options={[
                  { value: 'dumbbells',      label: lang === 'ar' ? 'دمبلز'         : 'Dumbbells' },
                  { value: 'barbell',        label: lang === 'ar' ? 'بار + أوزان'   : 'Barbell & Plates' },
                  { value: 'pull_up_bar',    label: lang === 'ar' ? 'عارضة عقلة'    : 'Pull-up Bar' },
                  { value: 'resistance_bands',label: lang === 'ar' ? 'حزام مقاومة'  : 'Resistance Bands' },
                  { value: 'kettlebell',     label: lang === 'ar' ? 'كيتل بيل'      : 'Kettlebell' },
                  { value: 'bench',          label: lang === 'ar' ? 'كرسي تمرين'    : 'Bench' },
                  { value: 'treadmill',      label: lang === 'ar' ? 'جهاز جري'      : 'Treadmill' },
                  { value: 'none',           label: lang === 'ar' ? 'بدون أجهزة'    : 'Bodyweight only' },
                ]}
                selected={Array.isArray(profile.equipment) ? profile.equipment : (profile.equipment || '').split(',').filter(Boolean)}
                onChange={vals => updateProfile('equipment', vals)}
              />
            </div>
          )}

          {/* Exercises to avoid */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'تمارين يجب تجنبها' : 'EXERCISES TO AVOID'}
            </p>
            <p className="font-heading text-xs mb-3" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'Ion لن يضع هذه التمارين في برنامجك أبداً' : 'Ion will never program these — injuries, dislikes, or any reason'}
            </p>
            <textarea
              value={profile.exercises_hated || ''}
              onChange={e => updateProfile('exercises_hated', e.target.value)}
              rows={2}
              placeholder={lang === 'ar' ? 'مثل: سكوات، بيرفي، تمارين ركبة...' : 'e.g. Burpees, barbell squats, running...'}
              className="w-full rounded-xl px-3 py-2.5 font-heading text-sm outline-none resize-none"
              style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
              onFocus={e => e.target.style.borderColor = 'rgba(187,92,246,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
            />
          </div>

          {/* Wellbeing */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'الصحة النفسية والجسدية' : 'WELLBEING'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label={lang === 'ar' ? 'مستوى التوتر اليومي' : 'Daily Stress Level'}
                value={profile.stress_level || 'moderate'}
                onChange={v => updateProfile('stress_level', v)}
                options={[
                  { value: 'low',      label: lang === 'ar' ? 'منخفض'        : 'Low' },
                  { value: 'moderate', label: lang === 'ar' ? 'متوسط'        : 'Moderate' },
                  { value: 'high',     label: lang === 'ar' ? 'عالٍ'         : 'High' },
                  { value: 'severe',   label: lang === 'ar' ? 'شديد جداً'    : 'Severe' },
                ]}
              />
              <SelectField
                label={lang === 'ar' ? 'جودة النوم' : 'Sleep Quality'}
                value={profile.sleep_quality || 'average'}
                onChange={v => updateProfile('sleep_quality', v)}
                options={[
                  { value: 'great',   label: lang === 'ar' ? 'ممتازة'    : 'Great (7-9 hrs)' },
                  { value: 'average', label: lang === 'ar' ? 'متوسطة'   : 'Average (5-7 hrs)' },
                  { value: 'poor',    label: lang === 'ar' ? 'ضعيفة'    : 'Poor (<5 hrs)' },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Nutrition ───────────────────────────────────────── */}
      {activeSection === 'nutrition' && (
        <div className="flex flex-col gap-4">
          {/* Dietary restrictions */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'النظام الغذائي والقيود' : 'DIETARY PREFERENCES'}
            </p>
            <p className="font-heading text-xs mb-4" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'Ion يستخدم هذا لبناء خطتك الغذائية' : 'Ion builds every meal around these restrictions'}
            </p>
            <CheckboxGroup
              options={[
                { value: 'vegan',         label: lang === 'ar' ? 'نباتي صرف (فيغان)'    : 'Vegan' },
                { value: 'vegetarian',    label: lang === 'ar' ? 'نباتي'                : 'Vegetarian' },
                { value: 'pescatarian',   label: lang === 'ar' ? 'بيسكيتاريان'          : 'Pescatarian' },
                { value: 'gluten_free',   label: lang === 'ar' ? 'خالٍ من الجلوتين'     : 'Gluten-free' },
                { value: 'dairy_free',    label: lang === 'ar' ? 'خالٍ من منتجات الألبان': 'Dairy-free' },
                { value: 'low_carb',      label: lang === 'ar' ? 'كربوهيدرات منخفضة'   : 'Low-carb / Keto' },
                { value: 'halal',         label: lang === 'ar' ? 'حلال'                 : 'Halal' },
                { value: 'no_pork',       label: lang === 'ar' ? 'بدون لحم خنزير'       : 'No pork' },
              ]}
              selected={Array.isArray(profile.dietary_preference) ? profile.dietary_preference : (profile.dietary_preference || '').split(',').filter(Boolean)}
              onChange={vals => updateProfile('dietary_preference', vals)}
            />
          </div>

          {/* Food preferences */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'الأطعمة المفضلة والمكروهة' : 'FOOD PREFERENCES'}
            </p>
            <div className="flex flex-col gap-4">
              <TextareaField
                label={lang === 'ar' ? '🟢 أطعمة أحبها — Ion سيضمّنها في الخطة' : '🟢 Foods I love — Ion will include these'}
                value={profile.foods_loved || ''}
                onChange={v => updateProfile('foods_loved', v)}
                placeholder={lang === 'ar' ? 'مثل: دجاج، أرز، تفاح، بيض، حليب...' : 'e.g. Chicken, rice, eggs, oats, apples...'}
                rows={2}
              />
              <TextareaField
                label={lang === 'ar' ? '🔴 أطعمة أكرهها — Ion لن يضعها أبداً' : '🔴 Foods I hate — Ion will never include these'}
                value={profile.foods_hated || ''}
                onChange={v => updateProfile('foods_hated', v)}
                placeholder={lang === 'ar' ? 'مثل: الكزبرة، السمك، الفطر...' : 'e.g. Coriander, fish, mushrooms...'}
                rows={2}
              />
              <TextareaField
                label={lang === 'ar' ? '⚠️ حساسية غذائية / حساسيات' : '⚠️ Allergies & intolerances'}
                value={profile.allergies || ''}
                onChange={v => updateProfile('allergies', v)}
                placeholder={lang === 'ar' ? 'مثل: فول السوداني، الغلوتين، اللاكتوز...' : 'e.g. Peanuts, gluten, lactose, shellfish...'}
                rows={2}
              />
            </div>
          </div>

          {/* Meal logistics */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'إعداد الطعام والميزانية' : 'COOKING & BUDGET'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label={lang === 'ar' ? 'عدد الوجبات يومياً' : 'Meals per day'}
                value={String(profile.meals_per_day || '3')}
                onChange={v => updateProfile('meals_per_day', parseInt(v))}
                options={['2','3','4','5','6'].map(v => ({ value: v, label: `${v} ${t(lang, 'settings_meals_suffix')}` }))}
              />
              <SelectField
                label={lang === 'ar' ? 'مستوى الطبخ' : 'Cooking ability'}
                value={profile.cooking_ability || 'cook'}
                onChange={v => updateProfile('cooking_ability', v)}
                options={[
                  { value: 'cook',    label: lang === 'ar' ? 'أحب الطبخ'          : 'I enjoy cooking' },
                  { value: 'quick',   label: lang === 'ar' ? 'وجبات سريعة فقط'    : 'Quick meals only' },
                  { value: 'eat_out', label: lang === 'ar' ? 'أفضل الأكل من الخارج': 'Prefer eating out' },
                ]}
              />
              <SelectField
                label={lang === 'ar' ? 'ميزانية الطعام' : 'Food budget'}
                value={profile.food_budget || 'moderate'}
                onChange={v => updateProfile('food_budget', v)}
                options={[
                  { value: 'budget',    label: lang === 'ar' ? 'اقتصادي'     : 'Budget-friendly' },
                  { value: 'moderate',  label: lang === 'ar' ? 'متوسط'       : 'Moderate' },
                  { value: 'high',      label: lang === 'ar' ? 'مرتفع'       : 'High (premium foods)' },
                ]}
              />
            </div>
          </div>

          {/* Supplements */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'المكملات الحالية' : 'CURRENT SUPPLEMENTS'}
            </p>
            <p className="font-heading text-xs mb-3" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'Ion يأخذ هذا بالاعتبار عند تقديم توصياته' : 'Ion factors these in when making supplement recommendations'}
            </p>
            <TextareaField
              label=""
              value={Array.isArray(profile.supplements) ? profile.supplements.join(', ') : (profile.supplements || '')}
              onChange={v => updateProfile('supplements', v.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder={lang === 'ar' ? 'مثل: بروتين، كرياتين، فيتامين D...' : 'e.g. Whey protein, creatine, vitamin D... (comma separated)'}
              rows={2}
            />
          </div>
        </div>
      )}

      {/* ── Health ──────────────────────────────────────────── */}
      {activeSection === 'health' && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'الإصابات والقيود الجسدية' : 'INJURIES & PHYSICAL LIMITATIONS'}
            </p>
            <p className="font-heading text-xs mb-3" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'Ion يتجنب أي تمارين تضر بهذه المناطق' : 'Ion avoids exercises that stress these areas'}
            </p>
            <TextareaField
              label=""
              value={profile.injuries || ''}
              onChange={v => updateProfile('injuries', v)}
              placeholder={lang === 'ar' ? 'مثل: ألم في الركبة اليسرى، مشكلة في الظهر السفلي...' : 'e.g. Left knee pain, lower back disc, shoulder impingement...'}
              rows={3}
            />
          </div>
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'الحالات الطبية' : 'MEDICAL CONDITIONS'}
            </p>
            <p className="font-heading text-xs mb-3" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'Ion يراعي هذا في كل توصياته' : 'Ion takes this into account for all recommendations'}
            </p>
            <TextareaField
              label=""
              value={profile.medical_conditions || ''}
              onChange={v => updateProfile('medical_conditions', v)}
              placeholder={lang === 'ar' ? 'مثل: ارتفاع ضغط الدم، السكري، الربو...' : 'e.g. Hypertension, diabetes, asthma, PCOS...'}
              rows={3}
            />
            <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <span className="text-base flex-shrink-0">⚕️</span>
              <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                {lang === 'ar'
                  ? 'Ion ليس بديلاً عن الطبيب. دائماً استشر طبيبك قبل بدء أي برنامج رياضي إذا كان لديك حالة طبية.'
                  : 'Ion is not a substitute for medical advice. Always consult your doctor before starting a new programme if you have a medical condition.'}
              </p>
            </div>
          </div>

          {/* InBody Scan */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} style={{ color: '#BB5CF6' }} />
              <p className="font-heading font-black text-xs tracking-widest uppercase" style={{ color: '#475569', letterSpacing: '0.14em' }}>
                {lang === 'ar' ? 'مسح تكوين الجسم (InBody)' : 'BODY COMPOSITION SCAN (INBODY)'}
              </p>
            </div>
            <p className="font-heading text-xs mb-4" style={{ color: '#64748B' }}>
              {lang === 'ar'
                ? 'ارفع صورة أو PDF من جهاز InBody. Ion يستخدم هذه البيانات لحساب البروتين الدقيق لك وتخصيص كل الخطط.'
                : 'Upload your InBody scan (image or PDF). Ion uses this to calculate your exact protein needs, macros, and supplement stack.'}
            </p>

            {/* Current InBody values grid */}
            {(profile.body_fat_pct || profile.muscle_mass_kg || profile.visceral_fat != null || profile.inbody_score != null) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: lang === 'ar' ? 'الدهون %' : 'Body Fat %', key: 'body_fat_pct', unit: '%', warn: profile.body_fat_pct > (profile.gender === 'female' ? 32 : 25) },
                  { label: lang === 'ar' ? 'كتلة العضلات' : 'Muscle Mass', key: 'muscle_mass_kg', unit: 'kg', warn: false },
                  { label: lang === 'ar' ? 'الدهون الحشوية' : 'Visceral Fat', key: 'visceral_fat', unit: '', warn: profile.visceral_fat > 10 },
                  { label: lang === 'ar' ? 'درجة InBody' : 'InBody Score', key: 'inbody_score', unit: '/100', warn: profile.inbody_score < 60 },
                  { label: lang === 'ar' ? 'معدل الأيض (BMR)' : 'Measured BMR', key: 'bmr_kcal', unit: ' kcal', warn: false },
                ].map(({ label, key, unit, warn }) => profile[key] != null ? (
                  <div key={key} className="rounded-xl p-3" style={{ background: warn ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${warn ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <p className="font-heading text-[10px] tracking-wider mb-1" style={{ color: warn ? '#F87171' : '#475569' }}>{label}</p>
                    <input
                      type="number"
                      value={profile[key] || ''}
                      onChange={e => updateProfile(key, parseFloat(e.target.value) || null)}
                      className="w-full font-heading font-black text-lg outline-none bg-transparent"
                      style={{ color: warn ? '#FCA5A5' : '#E2E8F0' }}
                    />
                    <p className="font-heading text-[10px]" style={{ color: '#334155' }}>{unit}</p>
                  </div>
                ) : null)}
              </div>
            )}

            {/* Upload button */}
            <label className={`w-full py-3 rounded-xl font-heading font-semibold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${inbodyAnalyzing ? 'opacity-60 pointer-events-none' : ''}`}
              style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.2)', color: '#BB5CF6', letterSpacing: '0.08em' }}>
              {inbodyAnalyzing
                ? <><RefreshCw size={13} className="animate-spin" />{lang === 'ar' ? 'جار التحليل...' : 'Analysing scan...'}</>
                : <><Upload size={13} />{profile.inbody_url ? (lang === 'ar' ? 'رفع مسح جديد' : 'Upload new scan') : (lang === 'ar' ? 'رفع مسح InBody' : 'Upload InBody scan')}</>}
              <input type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleInbodyUpload(f) }} />
            </label>

            {inbodySuccess && (
              <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={13} style={{ color: '#10B981', marginTop: 1, flexShrink: 0 }} />
                <p className="font-heading text-xs leading-relaxed" style={{ color: '#6EE7B7' }}>{inbodySuccess}</p>
              </div>
            )}
            {inbodyError && (
              <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={13} style={{ color: '#EF4444', marginTop: 1, flexShrink: 0 }} />
                <p className="font-heading text-xs leading-relaxed" style={{ color: '#FCA5A5' }}>{inbodyError}</p>
              </div>
            )}
            {!profile.body_fat_pct && !profile.muscle_mass_kg && !inbodyAnalyzing && !inbodyError && (
              <p className="font-heading text-xs mt-3 text-center" style={{ color: '#334155' }}>
                {lang === 'ar' ? 'لم يتم رفع مسح بعد — Ion يستخدم تقديرات افتراضية حالياً' : 'No scan on file — Ion is using population estimates. Upload for precision.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Preferences ─────────────────────────────────────── */}
      {activeSection === 'preferences' && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{t(lang, 'settings_language')}</p>
            <div className="flex gap-3">
              {(['en', 'ar'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setAppLang(l)}
                  className="flex-1 py-3 rounded-xl font-heading font-bold text-sm tracking-widest transition-all"
                  style={{
                    background: lang === l ? '#BB5CF6' : 'rgba(255,255,255,0.04)',
                    color: lang === l ? 'white' : '#475569',
                    border: `1px solid ${lang === l ? '#BB5CF6' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: lang === l ? '0 0 16px rgba(187,92,246,0.35)' : 'none',
                  }}
                >
                  {l === 'en' ? '🇬🇧 English' : '🇸🇦 العربية'}
                </button>
              ))}
            </div>
            {lang === 'ar' && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.18)' }}>
                <p className="font-heading text-sm mb-3" style={{ color: '#CBD5E1' }}>
                  ترجم الخطط والرسائل القديمة حتى تظهر تجربة آيون بالكامل بالعربية.
                </p>
                <button
                  onClick={localizeSavedArabicContent}
                  disabled={localizingArabic}
                  className="w-full py-3 rounded-xl font-heading font-black text-xs tracking-widest uppercase transition-all disabled:opacity-60"
                  style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.12em' }}
                >
                  {localizingArabic ? 'جار الترجمة...' : 'ترجمة المحتوى المحفوظ للعربية'}
                </button>
                {localizeResult && (
                  <p className="font-heading text-xs mt-3" style={{ color: '#94A3B8' }}>{localizeResult}</p>
                )}
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>{t(lang, 'settings_ion_appearance')}</p>
            <SelectField
              label={t(lang, 'settings_ion_gender')}
              value={profile.ion_gender || 'male'}
              onChange={v => updateProfile('ion_gender', v)}
              options={[{ value: 'male', label: t(lang, 'settings_ion_male') }, { value: 'female', label: t(lang, 'settings_ion_female') }]}
            />
          </div>
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-2" style={{ color: '#475569', letterSpacing: '0.14em' }}>
              {lang === 'ar' ? 'التغذية والصحة' : 'NUTRITION & HEALTH'}
            </p>
            <p className="font-heading text-xs mb-0" style={{ color: '#475569' }}>
              {lang === 'ar' ? 'الإعدادات التفصيلية موجودة في تبويبي "التغذية" و"الصحة"' : 'Detailed food preferences and health info are in the Nutrition & Health tabs'}
            </p>
          </div>
        </div>
      )}

      {/* ── Billing ─────────────────────────────────────────── */}
      {activeSection === 'billing' && (
        <div className="flex flex-col gap-4">

          {/* Launch mode notice */}
          {isLaunchMode && (
            <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Zap size={14} style={{ color: '#10B981' }} />
              <p className="font-heading text-xs" style={{ color: '#10B981' }}>
                <strong>Launch Special:</strong> All features are free during our launch period. Enjoy unlimited access!
              </p>
            </div>
          )}

          {/* Current plan card */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>CURRENT PLAN</p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {planLabel === 'Elite' && <Crown size={14} style={{ color: '#BB5CF6' }} />}
                  {planLabel === 'Pro' && <InfinityIcon size={14} style={{ color: '#BB5CF6' }} />}
                  <p className="font-heading font-black text-xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>
                    {planLabel}
                  </p>
                  {billingLabel && (
                    <span className="font-heading text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                      {billingLabel}
                    </span>
                  )}
                </div>

                {isTrial && trialDaysLeft !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
                    <p className="font-heading text-xs font-semibold" style={{ color: '#10B981' }}>
                      Trial active - {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                )}

                {isCancelled && periodEnd && periodEnd > new Date() && (
                  <p className="font-heading text-xs mt-1" style={{ color: '#F59E0B' }}>
                    Access until {periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
                {(cancelledAndExpired || status === 'free' || status === 'expired') && (
                  <p className="font-heading text-xs mt-1" style={{ color: '#EF4444' }}>
                    Subscription ended — you&apos;re on the free plan
                  </p>
                )}

                {isActive && periodEnd && (
                  <p className="font-heading text-xs mt-1" style={{ color: '#475569' }}>
                    Renews {periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: isFree ? 'rgba(255,255,255,0.04)' : 'rgba(187,92,246,0.12)',
                  border: `1px solid ${isFree ? 'rgba(255,255,255,0.06)' : 'rgba(187,92,246,0.25)'}`,
                }}>
                <CreditCard size={18} style={{ color: isFree ? '#475569' : '#BB5CF6' }} />
              </div>
            </div>

            {/* Trial countdown bar */}
            {isTrial && trialDaysLeft !== null && (
              <div className="mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="font-heading text-[10px]" style={{ color: '#475569' }}>Trial progress</span>
                  <span className="font-heading text-[10px]" style={{ color: '#10B981' }}>{7 - trialDaysLeft} / 7 days used</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${((7 - trialDaysLeft) / 7) * 100}%`,
                    background: trialDaysLeft <= 1 ? '#EF4444' : trialDaysLeft <= 2 ? '#F59E0B' : '#10B981',
                  }} />
                </div>
              </div>
            )}

            {/* Zero-charge guarantee during trial */}
            {isTrial && (
              <div className="p-3 rounded-xl flex items-center gap-2 mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <Shield size={13} style={{ color: '#10B981' }} />
                <p className="font-heading text-xs" style={{ color: '#10B981' }}>
                  Cancel before Day 7 = <strong>zero charges, ever</strong>. Our guarantee.
                </p>
              </div>
            )}

            {/* Upgrade CTA if Starter */}
            {isStarter && !isLaunchMode && (
              <Link href="/pricing">
                <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                  style={{ background: '#BB5CF6', color: 'white', boxShadow: '0 0 20px rgba(187,92,246,0.3)', letterSpacing: '0.08em' }}>
                  View Pro &amp; Elite Plans <ChevronRight size={14} />
                </button>
              </Link>
            )}
            {/* Upgrade to Elite CTA if Pro */}
            {planLabel === 'Pro' && isActive && !isLaunchMode && (
              <Link href="/pricing">
                <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                  style={{ background: 'rgba(187,92,246,0.12)', color: '#D88BFF', border: '1px solid rgba(187,92,246,0.25)', letterSpacing: '0.08em' }}>
                  Upgrade to Elite <ChevronRight size={14} />
                </button>
              </Link>
            )}
          </div>

          {/* Message usage */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>TODAY&apos;S USAGE</p>
            <MessageUsage userId={user?.id} plan={isLaunchMode ? 'unlimited' : planName} status={status} />
          </div>

          {/* Billing history */}
          {!isStarter && !isLaunchMode && (
            <BillingHistory />
          )}

          {/* Delete Account (GDPR) */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#EF4444', letterSpacing: '0.14em' }}>DANGER ZONE</p>
            <p className="font-heading text-xs mb-4 leading-relaxed" style={{ color: '#64748B' }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-heading text-xs" style={{ color: '#FCA5A5' }}>{deleteError}</p>
              </div>
            )}

            {deleteConfirm && (
              <div className="p-3 rounded-xl mb-4 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={13} style={{ color: '#EF4444', marginTop: 2 }} />
                <p className="font-heading text-xs leading-relaxed" style={{ color: '#FCA5A5' }}>
                  Are you absolutely sure? All your data, workouts, meals and progress will be erased forever.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl font-heading font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2"
                style={{
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#FCA5A5',
                  background: deleteConfirm ? 'rgba(239,68,68,0.1)' : 'transparent',
                }}
              >
                {deleteLoading ? (
                  <div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#EF4444', borderTopColor: 'transparent' }} />
                ) : deleteConfirm ? (
                  'Yes, delete my account'
                ) : (
                  'Delete Account'
                )}
              </button>
              {deleteConfirm && (
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteError(null) }}
                  className="px-4 py-3 rounded-xl font-heading text-xs tracking-wider"
                  style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Cancel section */}
          {canCancel && !isLaunchMode && (
            <div className="glass-card p-5">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>
                {isTrial ? 'CANCEL TRIAL' : 'CANCEL SUBSCRIPTION'}
              </p>

              {cancelResult ? (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="font-heading text-xs" style={{ color: '#10B981' }}>{cancelResult}</p>
                </div>
              ) : (
                <>
                  {isTrial && (
                    <div className="p-3 rounded-xl mb-4 flex items-start gap-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <Shield size={13} style={{ color: '#10B981', marginTop: 2 }} />
                      <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                        Cancelling during trial = <strong style={{ color: '#10B981' }}>zero charges, ever</strong>. Not a single riyal. You'll revert to the Starter plan immediately.
                      </p>
                    </div>
                  )}

                  {!isTrial && (
                    <p className="font-heading text-xs mb-4 leading-relaxed" style={{ color: '#64748B' }}>
                      You'll keep access until {periodEnd?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) || 'end of period'}, then revert to the Starter plan.
                    </p>
                  )}

                  {cancelConfirm && (
                    <div className="p-3 rounded-xl mb-4 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle size={13} style={{ color: '#EF4444', marginTop: 2 }} />
                      <p className="font-heading text-xs leading-relaxed" style={{ color: '#FCA5A5' }}>
                        Are you sure? Click &quot;Confirm Cancel&quot; to proceed.
                        {isTrial ? ' This will end your trial with zero charges.' : ' You keep access until period ends.'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className="w-full py-3 rounded-xl font-heading font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2"
                    style={{
                      border: `1px solid ${cancelConfirm ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: cancelConfirm ? '#FCA5A5' : '#475569',
                      background: cancelConfirm ? 'rgba(239,68,68,0.06)' : 'transparent',
                    }}
                  >
                    {cancelLoading ? (
                      <>
                        <div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: '#EF4444', borderTopColor: 'transparent' }} />
                        Cancelling...
                      </>
                    ) : cancelConfirm ? (
                      'Confirm Cancel'
                    ) : (
                      isTrial ? 'Cancel Trial (zero charges)' : 'Cancel Subscription'
                    )}
                  </button>

                  {cancelConfirm && (
                    <button
                      onClick={() => setCancelConfirm(false)}
                      className="w-full mt-2 py-2.5 rounded-xl font-heading text-xs tracking-wider"
                      style={{ color: '#475569' }}
                    >
                      Keep my plan
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Integrations (Coming Soon) ───────────────────────── */}
      {activeSection === 'integrations' && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-1" style={{ color: '#475569', letterSpacing: '0.14em' }}>WEARABLES & INTEGRATIONS</p>
            <p className="font-heading text-xs mb-5" style={{ color: '#64748B' }}>Connect your devices to automatically sync workouts and health data.</p>

            {[
              { name: 'Apple Health', logo: '🍎', desc: 'Sync steps, heart rate & sleep from Apple Health.' },
              { name: 'Google Fit', logo: '🟢', desc: 'Import activity data from Google Fit.' },
              { name: 'Garmin', logo: '⌚', desc: 'Connect your Garmin device for workout data.' },
              { name: 'Fitbit', logo: '💜', desc: 'Sync Fitbit daily activity and sleep tracking.' },
              { name: 'Whoop', logo: '🔴', desc: 'Import recovery and strain data from Whoop.' },
              { name: 'MyFitnessPal', logo: '🥗', desc: 'Import nutrition logs from MyFitnessPal.' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.logo}</span>
                  <div>
                    <p className="font-heading font-semibold text-sm text-white">{item.name}</p>
                    <p className="font-heading text-xs" style={{ color: '#475569' }}>{item.desc}</p>
                  </div>
                </div>
                <span
                  className="font-heading font-bold text-[10px] px-2.5 py-1 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#334155', border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.1em' }}
                >
                  SOON
                </span>
              </div>
            ))}

            <div className="mt-5 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.12)' }}>
              <Zap size={14} style={{ color: '#BB5CF6', flexShrink: 0 }} />
              <p className="font-heading text-xs" style={{ color: '#64748B' }}>
                Wearable integrations are in development. Elite members get first access when they launch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save button (all editable sections) */}
      {activeSection !== 'billing' && activeSection !== 'integrations' && (
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: saved ? '#108981' : '#BB5CF6',
              color: 'white',
              letterSpacing: '0.1em',
              boxShadow: saved ? '0 0 25px rgba(16,137,129,0.4)' : '0 0 25px rgba(187,92,246,0.35)',
            }}
          >
            <Save size={14} />
            {saving ? t(lang, 'settings_saving') : saved ? t(lang, 'settings_saved') : t(lang, 'settings_save')}
          </button>

          <button
            onClick={signOut}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LogOut size={13} /> {t(lang, 'settings_signout')}
          </button>
        </div>
      )}

      {(activeSection === 'billing' || activeSection === 'integrations') && (

        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={signOut}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LogOut size={13} /> {t(lang, 'settings_signout')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Message usage component ───────────────────────────────────
function MessageUsage({ userId, plan, status }: { userId?: string; plan: string; status: string }) {
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null)

  useEffect(() => {
    if (!userId) return
    const supabase = createBrowserClient()
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('message_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        const limits: Record<string, number> = {
          starter: 5, free: 5,
          trial: Infinity, pro: Infinity, unlimited: Infinity, elite: Infinity,
        }
        const limit = limits[plan] ?? limits[status] ?? 5
        setUsage({ count: data?.count || 0, limit })
      })
  }, [userId, plan, status])

  if (!usage) return <p className="font-heading text-xs" style={{ color: '#475569' }}>Loading...</p>

  const isUnlimited = usage.limit === Infinity
  const pct = isUnlimited ? 0 : (usage.count / usage.limit) * 100

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-heading text-xs text-white font-semibold">Messages sent today</span>
        <span className="font-heading text-xs font-bold" style={{ color: isUnlimited ? '#BB5CF6' : pct >= 80 ? '#EF4444' : '#94A3B8' }}>
          {isUnlimited ? '∞ Unlimited' : `${usage.count} / ${usage.limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 80 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#BB5CF6',
          }} />
        </div>
      )}
      {!isUnlimited && pct >= 80 && (
        <div className="mt-3">
          <Link href="/pricing">
            <button className="w-full py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider"
              style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#BB5CF6' }}>
              Upgrade for more messages
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Form components ───────────────────────────────────────────

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="font-heading text-[10px] tracking-wider block mb-1.5" style={{ color: '#475569' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 font-heading text-sm outline-none"
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
        onFocus={e => e.target.style.borderColor = 'rgba(187,92,246,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
      />
    </div>
  )
}

function BillingHistory() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/history')
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (events.length === 0) return null

  return (
    <div className="glass-card p-5">
      <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>BILLING HISTORY</p>
      <div className="flex flex-col gap-2">
        {events.map((ev, i) => (
          <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div>
              <p className="font-heading text-xs font-semibold text-white">{ev.label}</p>
              <p className="font-heading text-[10px] mt-0.5" style={{ color: '#475569' }}>
                {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              {ev.amount && <p className="font-heading text-xs font-semibold" style={{ color: '#BB5CF6' }}>{ev.amount}</p>}
              {ev.status && <p className="font-heading text-[10px] mt-0.5 capitalize" style={{ color: ev.type === 'subscription_payment_failed' ? '#EF4444' : '#10B981' }}>{ev.status}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="font-heading text-[10px] tracking-wider block mb-1.5" style={{ color: '#475569' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 font-heading text-sm outline-none"
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div>
      {label && <label className="font-heading text-[10px] tracking-wider block mb-1.5" style={{ color: '#475569' }}>{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 font-heading text-sm outline-none resize-none"
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
        onFocus={e => e.target.style.borderColor = 'rgba(187,92,246,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
      />
    </div>
  )
}

function CheckboxGroup({ options, selected, onChange }: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val]
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className="px-3 py-1.5 rounded-full font-heading text-xs font-semibold transition-all"
            style={{
              background: active ? 'rgba(187,92,246,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(187,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: active ? '#D88BFF' : '#64748B',
            }}
          >
            {active ? '✓ ' : ''}{o.label}
          </button>
        )
      })}
    </div>
  )
}
