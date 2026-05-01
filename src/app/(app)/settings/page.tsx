'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import IonAvatar from '@/components/ui/IonAvatar'
import { Save, LogOut, Trash2, Globe, User, Dumbbell, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [activeSection, setActiveSection] = useState('profile')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const [profileRes, userRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('users').select('language').eq('id', user.id).single(),
    ])
    setProfile(profileRes.data || {})
    setLang(userRes.data?.language || 'en')
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

  function updateProfile(key: string, value: any) {
    setProfile((prev: any) => ({ ...prev, [key]: value }))
  }

  const SECTIONS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'training', label: 'Training', icon: Dumbbell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ]

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

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
      <div className="flex gap-2 mb-6">
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

      {/* Save button */}
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
    </div>
  )
}

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
