'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { Save, LogOut, Globe, User, Dumbbell, CreditCard, Shield, ChevronRight, AlertTriangle, Infinity as InfinityIcon, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [activeSection, setActiveSection] = useState('profile')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelResult, setCancelResult] = useState<string | null>(null)

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

    const [profileRes, userRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('users').select('language').eq('id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    ])
    setProfile(profileRes.data || {})
    setLang(userRes.data?.language || 'en')
    setSubscription(subRes.data || null)
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    const supabase = createBrowserClient()
    await supabase.from('profiles').update(profile).eq('user_id', user.id)
    await supabase.from('users').update({ language: lang }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
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

  const isLaunchMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'true'

  const SECTIONS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'training', label: 'Training', icon: Dumbbell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  // ── Subscription state helpers ─────────────────────────
  const sub = subscription
  const status = sub?.status || 'free'
  const planName = sub?.plan_name || 'free'
  const isTrial = status === 'trial'
  const isActive = status === 'active'
  const isCancelled = status === 'cancelled'
  const isFree = !sub || status === 'free' || status === 'expired'

  const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null

  const periodEnd = sub?.current_period_ends_at ? new Date(sub.current_period_ends_at) : null

  const planLabel = planName === 'unlimited' ? 'Pro + Unlimited' : planName === 'pro' ? 'Pro' : 'Free'
  const billingLabel = sub?.billing_period === 'annual' ? 'Annual' : sub?.billing_period === 'monthly' ? 'Monthly' : ''
  const canCancel = (isTrial || isActive) && sub?.lemon_squeezy_subscription_id

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>ACCOUNT</p>
        <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>Settings</h1>
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-semibold tracking-wider transition-all"
            style={{
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
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>PERSONAL INFO</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={profile.name || ''} onChange={v => updateProfile('name', v)} />
              <Field label="Age" value={String(profile.age || '')} onChange={v => updateProfile('age', parseInt(v) || v)} type="number" />
              <Field label="Weight (kg)" value={String(profile.weight_kg || '')} onChange={v => updateProfile('weight_kg', parseFloat(v) || v)} type="number" />
              <Field label="Height (cm)" value={String(profile.height_cm || '')} onChange={v => updateProfile('height_cm', parseFloat(v) || v)} type="number" />
              <SelectField label="Gender" value={profile.gender || 'male'} onChange={v => updateProfile('gender', v)}
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
              <SelectField label="Goal" value={profile.goal || ''} onChange={v => updateProfile('goal', v)}
                options={[
                  { value: 'lose_fat', label: 'Lose Fat' },
                  { value: 'build_muscle', label: 'Build Muscle' },
                  { value: 'recomposition', label: 'Recomposition' },
                  { value: 'improve_fitness', label: 'Improve Fitness' },
                  { value: 'be_healthier', label: 'Be Healthier' },
                ]} />
            </div>
          </div>
        </div>
      )}

      {/* ── Training ────────────────────────────────────────── */}
      {activeSection === 'training' && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>TRAINING PREFS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Training Days / Week" value={String(profile.training_days || '3')} onChange={v => updateProfile('training_days', parseInt(v))}
                options={['2','3','4','5','6'].map(v => ({ value: v, label: `${v} days` }))} />
              <SelectField label="Session Duration" value={String(profile.session_duration || '60')} onChange={v => updateProfile('session_duration', parseInt(v))}
                options={[{ value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' }, { value: '90', label: '90 min' }]} />
              <SelectField label="Gym Access" value={profile.gym_access ? 'true' : 'false'} onChange={v => updateProfile('gym_access', v === 'true')}
                options={[{ value: 'true', label: 'Gym' }, { value: 'false', label: 'Home' }]} />
              <SelectField label="Training Time" value={profile.training_time || 'morning'} onChange={v => updateProfile('training_time', v)}
                options={[
                  { value: 'morning', label: 'Morning' },
                  { value: 'afternoon', label: 'Afternoon' },
                  { value: 'evening', label: 'Evening' },
                  { value: 'late_night', label: 'Late Night' },
                ]} />
            </div>
            <div className="mt-4">
              <label className="font-heading text-[10px] tracking-wider block mb-1.5" style={{ color: '#475569' }}>Injuries / Limitations</label>
              <textarea
                value={profile.injuries || ''}
                onChange={e => updateProfile('injuries', e.target.value)}
                rows={2}
                placeholder="None"
                className="w-full rounded-xl px-3 py-2.5 font-heading text-sm outline-none resize-none"
                style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences ─────────────────────────────────────── */}
      {activeSection === 'preferences' && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>LANGUAGE</p>
            <div className="flex gap-3">
              {(['en', 'ar'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
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
          </div>
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>ION APPEARANCE</p>
            <SelectField
              label="Ion Gender"
              value={profile.ion_gender || 'male'}
              onChange={v => updateProfile('ion_gender', v)}
              options={[{ value: 'male', label: '♂ Male Ion' }, { value: 'female', label: '♀ Female Ion' }]}
            />
          </div>
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>NUTRITION</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Meals per Day" value={String(profile.meals_per_day || '3')} onChange={v => updateProfile('meals_per_day', parseInt(v))}
                options={['2','3','4','5','6'].map(v => ({ value: v, label: `${v} meals` }))} />
              <SelectField label="Cooking Ability" value={profile.cooking_ability || 'cook'} onChange={v => updateProfile('cooking_ability', v)}
                options={[{ value: 'cook', label: 'I Cook' }, { value: 'quick', label: 'Quick & Simple' }, { value: 'eat_out', label: 'Eat Out Mostly' }]} />
            </div>
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
                🎉 <strong>Launch Special:</strong> All features are free during our launch period. Enjoy unlimited access!
              </p>
            </div>
          )}

          {/* Current plan card */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>CURRENT PLAN</p>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {planName === 'unlimited' && <InfinityIcon size={14} style={{ color: '#22D3EE' }} />}
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
                      Trial active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                )}

                {isCancelled && periodEnd && (
                  <p className="font-heading text-xs mt-1" style={{ color: '#F59E0B' }}>
                    Access until {periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

            {/* Upgrade CTA if free */}
            {isFree && !isLaunchMode && (
              <Link href="/pricing">
                <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all mt-2"
                  style={{ background: '#BB5CF6', color: 'white', boxShadow: '0 0 20px rgba(187,92,246,0.3)', letterSpacing: '0.08em' }}>
                  Upgrade to Pro <ChevronRight size={14} />
                </button>
              </Link>
            )}
          </div>

          {/* Message usage */}
          <div className="glass-card p-5">
            <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>TODAY&apos;S USAGE</p>
            <MessageUsage userId={user?.id} plan={isLaunchMode ? 'unlimited' : planName} status={status} />
          </div>

          {/* Cancel section */}
          {canCancel && !isLaunchMode && (
            <div className="glass-card p-5">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-4" style={{ color: '#475569', letterSpacing: '0.14em' }}>
                {isTrial ? 'CANCEL TRIAL' : 'CANCEL SUBSCRIPTION'}
              </p>

              {cancelResult ? (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="font-heading text-xs" style={{ color: '#10B981' }}>✅ {cancelResult}</p>
                </div>
              ) : (
                <>
                  {isTrial && (
                    <div className="p-3 rounded-xl mb-4 flex items-start gap-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <Shield size={13} style={{ color: '#10B981', marginTop: 2 }} />
                      <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                        Cancelling during trial = <strong style={{ color: '#10B981' }}>zero charges, ever</strong>. Not a single riyal. You'll revert to the free plan immediately.
                      </p>
                    </div>
                  )}

                  {!isTrial && (
                    <p className="font-heading text-xs mb-4 leading-relaxed" style={{ color: '#64748B' }}>
                      You'll keep access until {periodEnd?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) || 'end of period'}, then revert to the free plan.
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

      {/* Save button (only for profile/training/preferences) */}
      {activeSection !== 'billing' && (
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
            {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
          </button>

          <button
            onClick={signOut}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}

      {activeSection === 'billing' && (
        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={signOut}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <LogOut size={13} /> Sign Out
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
      .single()
      .then(({ data }) => {
        const limits: Record<string, number> = { free: 5, trial: 30, pro: 30, unlimited: Infinity }
        const limit = plan === 'unlimited' || status === 'unlimited' ? Infinity : (limits[plan] || limits[status] || 5)
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
              Upgrade for more messages →
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
