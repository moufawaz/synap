'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import {
  Plus, Ruler, ChevronDown, ChevronUp, Camera, ArrowLeftRight,
  TrendingUp, TrendingDown, Upload, FileText, CheckCircle,
  AlertCircle, RefreshCw, Loader2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const FIELDS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', icon: '⚖️' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', icon: '📊' },
  { key: 'neck_cm', label: 'Neck', unit: 'cm', icon: '📏' },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm', icon: '📏' },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', icon: '📏' },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', icon: '📏' },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', icon: '📏' },
  { key: 'bicep_left_cm', label: 'Left Bicep', unit: 'cm', icon: '💪' },
  { key: 'bicep_right_cm', label: 'Right Bicep', unit: 'cm', icon: '💪' },
  { key: 'thigh_left_cm', label: 'Left Thigh', unit: 'cm', icon: '🦵' },
  { key: 'thigh_right_cm', label: 'Right Thigh', unit: 'cm', icon: '🦵' },
  { key: 'calf_left_cm', label: 'Left Calf', unit: 'cm', icon: '🦵' },
  { key: 'calf_right_cm', label: 'Right Calf', unit: 'cm', icon: '🦵' },
]

const SYMMETRY_PAIRS: [string, string, string][] = [
  ['bicep_left_cm', 'bicep_right_cm', 'Biceps'],
  ['thigh_left_cm', 'thigh_right_cm', 'Thighs'],
  ['calf_left_cm', 'calf_right_cm', 'Calves'],
]

const INBODY_ANALYSIS_CACHE_PREFIX = 'synap_inbody_analysis_'

interface InBodyAnalysis {
  body_weight_kg: number | null
  body_fat_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  bmr_kcal: number | null
  visceral_fat: number | null
  bmi: number | null
  body_water_kg: number | null
  inbody_score: number | null
  segmental: {
    left_arm_kg: number | null
    right_arm_kg: number | null
    left_leg_kg: number | null
    right_leg_kg: number | null
    trunk_kg: number | null
  } | null
  coaching_summary: string
}

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'stats' | 'symmetry' | 'photos' | 'inbody'>('stats')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Record<string, string>>({})
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelected, setCompareSelected] = useState<number[]>([])
  const [inbodyUrl, setInbodyUrl] = useState<string | null>(null)
  const [uploadingInbody, setUploadingInbody] = useState(false)
  const [analyzingInbody, setAnalyzingInbody] = useState(false)
  const [inbodyAnalysis, setInbodyAnalysis] = useState<InBodyAnalysis | null>(null)
  const [inbodyError, setInbodyError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const inbodyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadMeasurements(); loadInbody() }, [])

  async function loadMeasurements() {
    const res = await fetch('/api/measurements')
    const data = await res.json()
    const list = data.measurements || []
    setMeasurements(list)
    setLoading(false)
    // Generate signed URLs for private progress-photos bucket
    const photoPaths = list.filter((m: any) => m.photo_url && !m.photo_url.startsWith('http')).map((m: any) => m.photo_url as string)
    if (photoPaths.length > 0) {
      const supabase = createBrowserClient()
      const signed: Record<string, string> = {}
      await Promise.all(photoPaths.map(async (path: string) => {
        const { data: sd } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600)
        if (sd?.signedUrl) signed[path] = sd.signedUrl
      }))
      setSignedPhotoUrls(signed)
    }
  }

  async function loadInbody() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('inbody_url').eq('user_id', user.id).single()
    if (data?.inbody_url) {
      setInbodyUrl(data.inbody_url)
      // Load cached analysis from localStorage
      try {
        const cached = localStorage.getItem(INBODY_ANALYSIS_CACHE_PREFIX + data.inbody_url)
        if (cached) setInbodyAnalysis(JSON.parse(cached))
      } catch {}
    }
  }

  async function analyzeInbody(url: string) {
    setAnalyzingInbody(true)
    setInbodyError(null)
    try {
      const res = await fetch('/api/analyze-inbody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inbody_url: url }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setInbodyError(result.error || 'Analysis failed. Please ensure the image is clear and try again.')
      } else {
        setInbodyAnalysis(result.data)
        // Cache result so it survives page refreshes
        try {
          localStorage.setItem(INBODY_ANALYSIS_CACHE_PREFIX + url, JSON.stringify(result.data))
        } catch {}
        // Auto-populate measurements from InBody data
        const d = result.data
        const payload: Record<string, any> = { date: new Date().toISOString().split('T')[0] }
        if (d.body_weight_kg != null) payload.weight_kg = d.body_weight_kg
        if (d.body_fat_pct != null) payload.body_fat_pct = d.body_fat_pct
        if (Object.keys(payload).length > 1) {
          fetch('/api/measurements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(() => loadMeasurements()).catch(() => {})
        }
      }
    } catch (err: any) {
      console.error('[measurements] InBody analysis error:', err)
      setInbodyError('Analysis failed. Please check your connection and try again.')
    } finally {
      setAnalyzingInbody(false)
    }
  }

  async function uploadInbody(file: File) {
    setUploadingInbody(true)
    setInbodyError(null)
    setInbodyAnalysis(null)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/inbody_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('inbody-scans')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('inbody-scans').getPublicUrl(path)
      const newUrl = urlData.publicUrl

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ inbody_url: newUrl })
        .eq('user_id', user.id)
      if (profileError) throw profileError

      setInbodyUrl(newUrl)
      setUploadingInbody(false)

      // Auto-run AI analysis
      await analyzeInbody(newUrl)
    } catch (e: any) {
      console.error('[measurements] InBody upload error:', e)
      setInbodyError(e?.message || 'Upload failed. Please try again.')
      setUploadingInbody(false)
    }
  }

  async function saveMeasurement() {
    if (!form.weight_kg) return
    setSaving(true)
    const payload: Record<string, any> = { date: new Date().toISOString().split('T')[0] }
    FIELDS.forEach(f => { if (form[f.key]) payload[f.key] = parseFloat(form[f.key]) })
    await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setForm({})
    setShowForm(false)
    setSaving(false)
    loadMeasurements()
  }

  async function uploadProgressPhoto(file: File) {
    setUploadingPhoto(true)
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: false })
      if (error) throw error
      // Store the storage path (not public URL) — bucket is private, use signed URLs for display
      const storagePath = data.path
      const today = new Date().toISOString().split('T')[0]
      const latest = measurements[0]
      if (latest && latest.date === today) {
        await supabase.from('measurements').update({ photo_url: storagePath }).eq('id', latest.id)
      } else {
        await supabase.from('measurements').insert({ user_id: user.id, date: today, photo_url: storagePath })
      }
      loadMeasurements()
    } catch (err) {
      console.error('[measurements] Photo upload error:', err)
    }
    setUploadingPhoto(false)
  }

  const latest = measurements[0]
  const prev = measurements[1]

  function getDelta(key: string): number | null {
    if (!latest || !prev) return null
    const a = latest[key], b = prev[key]
    if (a == null || b == null) return null
    return parseFloat((a - b).toFixed(1))
  }

  function deltaColor(key: string, delta: number | null): string {
    if (delta == null) return '#475569'
    const shrinkGood = ['weight_kg', 'body_fat_pct', 'waist_cm', 'hips_cm']
    if (shrinkGood.includes(key)) return delta < 0 ? '#10B981' : delta > 0 ? '#F59E0B' : '#475569'
    return delta > 0 ? '#10B981' : delta < 0 ? '#F59E0B' : '#475569'
  }

  const symmetryData = SYMMETRY_PAIRS.map(([lk, rk, label]) => {
    const l = latest?.[lk], r = latest?.[rk]
    const gap = l != null && r != null ? Math.abs(l - r).toFixed(1) : null
    const dominant = l != null && r != null ? (l > r ? 'Left' : r > l ? 'Right' : 'Even') : null
    const isGood = gap != null && parseFloat(gap) <= 0.5
    return { label, l, r, gap, dominant, isGood }
  })

  const photos = measurements.filter((m: any) => m.photo_url)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>BODY TRACKING</p>
          <h1 className="font-heading font-bold text-2xl text-white">Measurements</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all"
            style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6', border: '1px solid rgba(187,92,246,0.2)' }}
          >
            <Camera size={13} /> {uploadingPhoto ? '...' : 'Photo'}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadProgressPhoto(e.target.files[0])} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold text-xs tracking-wider transition-all"
            style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.08em', boxShadow: '0 0 16px rgba(187,92,246,0.35)' }}
          >
            <Plus size={13} /> LOG
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass-card p-5 mb-6" style={{ border: '1px solid rgba(187,92,246,0.25)' }}>
          <p className="font-heading font-bold text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.08em' }}>TODAY'S MEASUREMENTS</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {FIELDS.map(field => (
              <div key={field.key}>
                <label className="font-heading text-[10px] tracking-wider block mb-1" style={{ color: '#475569' }}>
                  {field.icon} {field.label} ({field.unit})
                  {field.key === 'weight_kg' && <span style={{ color: '#BB5CF6' }}> *</span>}
                </label>
                <input
                  type="number" step="0.1"
                  value={form[field.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="-"
                  className="w-full rounded-lg px-3 py-2 font-heading text-sm outline-none transition-all"
                  style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F0FF' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)' }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveMeasurement}
              disabled={!form.weight_kg || saving}
              className="flex-1 py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all"
              style={{
                background: form.weight_kg ? '#BB5CF6' : 'rgba(255,255,255,0.05)',
                color: form.weight_kg ? 'white' : '#2D3748',
                letterSpacing: '0.08em',
                boxShadow: form.weight_kg ? '0 0 16px rgba(187,92,246,0.3)' : 'none',
              }}
            >
              {saving ? 'SAVING...' : 'SAVE MEASUREMENTS'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({}) }}
              className="px-4 py-2.5 rounded-xl font-heading text-xs font-semibold"
              style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {measurements.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['stats', 'symmetry', 'photos', 'inbody'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-1.5 rounded-lg font-heading font-semibold text-xs capitalize transition-all"
              style={{
                background: activeTab === t ? 'rgba(187,92,246,0.2)' : 'transparent',
                color: activeTab === t ? '#D88BFF' : '#64748B',
                border: activeTab === t ? '1px solid rgba(187,92,246,0.3)' : '1px solid transparent',
              }}
            >
              {t === 'symmetry' ? <ArrowLeftRight size={12} className="inline mr-1" /> : null}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && latest && (
        <div className="mb-6">
          <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.14em' }}>
            LATEST - {new Date(latest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FIELDS.filter(f => latest[f.key] != null).map(field => {
              const delta = getDelta(field.key)
              return (
                <div key={field.key} className="glass-card p-4">
                  <p className="font-heading text-[10px] tracking-wider mb-1" style={{ color: '#475569' }}>
                    {field.icon} {field.label}
                  </p>
                  <p className="font-heading font-bold text-xl text-white">
                    {latest[field.key]}
                    <span className="text-xs font-normal ml-1" style={{ color: '#475569' }}>{field.unit}</span>
                  </p>
                  {delta != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {delta < 0 ? <TrendingDown size={10} /> : delta > 0 ? <TrendingUp size={10} /> : null}
                      <span className="font-heading text-xs font-semibold" style={{ color: deltaColor(field.key, delta) }}>
                        {delta > 0 ? '+' : ''}{delta} {field.unit}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Symmetry tab */}
      {activeTab === 'symmetry' && (
        <div className="mb-6 flex flex-col gap-4">
          <div className="glass-card p-5" style={{ borderColor: 'rgba(187,92,246,0.15)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight size={16} style={{ color: '#BB5CF6' }} />
              <p className="font-heading font-bold text-sm text-white">Limb Symmetry Tracker</p>
            </div>
            <p className="font-heading text-xs mb-5" style={{ color: '#64748B' }}>
              Ion monitors left/right balance. A gap above 1cm warrants attention.
            </p>
            {symmetryData.map(({ label, l, r, gap, dominant, isGood }) => (
              <div key={label} className="mb-5 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-heading font-semibold text-sm text-white">{label}</p>
                  {gap != null && (
                    <span className="font-heading text-xs px-2 py-0.5 rounded-full" style={{
                      background: isGood ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: isGood ? '#10B981' : '#F59E0B',
                      border: `1px solid ${isGood ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    }}>
                      {isGood ? 'Balanced' : `${gap}cm gap`}
                    </span>
                  )}
                </div>
                {l != null && r != null ? (
                  <div>
                    <div className="flex items-center gap-3">
                      {[{ side: 'Left', val: l }, { side: 'Right', val: r }].map(({ side, val }) => (
                        <div key={side} className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{side}</span>
                            <span className="font-heading text-xs font-bold text-white">{val} cm</span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${(val / Math.max(l, r)) * 100}%`, background: '#BB5CF6' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {dominant && dominant !== 'Even' && (
                      <p className="font-heading text-xs mt-2" style={{ color: '#64748B' }}>
                        {dominant} side is dominant by {gap}cm
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-heading text-xs" style={{ color: '#2D3748' }}>Log both sides to see symmetry</p>
                )}
              </div>
            ))}
          </div>
          <div className="glass-card p-5" style={{ borderColor: 'rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} style={{ color: '#10B981' }} />
              <p className="font-heading font-bold text-sm text-white">Body Symmetry Coach</p>
            </div>
            {(() => {
              const focus = symmetryData.find(item => item.gap != null && parseFloat(item.gap) > 0.5)
              if (!focus) {
                return (
                  <p className="font-heading text-sm leading-relaxed" style={{ color: '#64748B' }}>
                    Your logged left/right measurements are balanced. Keep using the same range of motion on both sides and recheck every two weeks.
                  </p>
                )
              }
              const drill = focus.label === 'Biceps'
                ? 'single-arm curls and controlled cable curls'
                : focus.label === 'Thighs'
                  ? 'split squats, single-leg press, and step-ups'
                  : 'single-leg calf raises with a pause at the top'
              return (
                <div>
                  <p className="font-heading text-sm leading-relaxed" style={{ color: '#64748B' }}>
                    {focus.label} need attention: {focus.gap}cm gap. Start unilateral work on the smaller side first.
                  </p>
                  <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <p className="font-heading text-xs font-bold mb-1" style={{ color: '#10B981' }}>Correction plan</p>
                    <p className="font-heading text-xs" style={{ color: '#94A3B8' }}>
                      Add 2 extra sets of {drill}. Match reps on the stronger side, then remeasure in 14 days.
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Photos tab */}
      {activeTab === 'photos' && (
        <div className="mb-6">
          {photos.length === 0 ? (
            <div className="glass-card p-8 text-center flex flex-col items-center gap-4">
              <Camera size={32} style={{ color: '#2D3748' }} />
              <div>
                <p className="font-heading font-bold text-white mb-1">No progress photos yet</p>
                <p className="font-heading text-sm mb-4" style={{ color: '#64748B' }}>Tap the Camera button to upload your first progress photo.</p>
              </div>
              <button onClick={() => photoInputRef.current?.click()} className="btn-primary text-sm">
                <Camera size={13} /> Upload Photo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* ── Compare mode header ── */}
              <div className="flex items-center justify-between">
                <p className="font-heading text-xs tracking-widest uppercase" style={{ color: '#475569', letterSpacing: '0.12em' }}>
                  {compareMode
                    ? compareSelected.length === 0
                      ? 'SELECT FIRST PHOTO'
                      : compareSelected.length === 1
                      ? 'SELECT SECOND PHOTO'
                      : 'COMPARING 2 PHOTOS'
                    : `${photos.length} PHOTO${photos.length !== 1 ? 'S' : ''}`}
                </p>
                <div className="flex gap-2">
                  {!compareMode ? (
                    photos.length >= 2 && (
                      <button
                        onClick={() => { setCompareMode(true); setCompareSelected([]) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-heading font-bold text-xs transition-all"
                        style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#BB5CF6' }}
                      >
                        <ArrowLeftRight size={11} /> Compare
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => { setCompareMode(false); setCompareSelected([]) }}
                      className="px-3 py-1.5 rounded-lg font-heading font-bold text-xs transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* ── Side-by-side comparison view ── */}
              {compareMode && compareSelected.length === 2 && (() => {
                const a = photos[compareSelected[0]]
                const b = photos[compareSelected[1]]
                const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                const weightDiff = a.weight_kg && b.weight_kg ? parseFloat((b.weight_kg - a.weight_kg).toFixed(1)) : null

                return (
                  <div className="glass-card p-4" style={{ border: '1px solid rgba(187,92,246,0.2)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowLeftRight size={14} style={{ color: '#BB5CF6' }} />
                      <p className="font-heading font-bold text-xs text-white tracking-wider" style={{ letterSpacing: '0.08em' }}>BEFORE vs AFTER</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[{ photo: a, label: 'Before', idx: 0 }, { photo: b, label: 'After', idx: 1 }].map(({ photo, label, idx }) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <p className="font-heading text-[10px] tracking-widest uppercase" style={{ color: idx === 0 ? '#F59E0B' : '#10B981' }}>{label}</p>
                          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                            <img src={photo.photo_url?.startsWith('http') ? photo.photo_url : (signedPhotoUrls[photo.photo_url] || '')} alt={photo.date} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
                              <p className="font-heading text-[10px] text-white">{fmtDate(photo.date)}</p>
                              {photo.weight_kg && <p className="font-heading text-[10px]" style={{ color: '#D88BFF' }}>{photo.weight_kg} kg</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delta row */}
                    {weightDiff != null && (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl"
                        style={{ background: weightDiff < 0 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${weightDiff < 0 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                        {weightDiff < 0
                          ? <TrendingDown size={13} style={{ color: '#10B981' }} />
                          : <TrendingUp size={13} style={{ color: '#F59E0B' }} />}
                        <p className="font-heading font-bold text-xs" style={{ color: weightDiff < 0 ? '#10B981' : '#F59E0B' }}>
                          {weightDiff > 0 ? '+' : ''}{weightDiff} kg since {fmtDate(a.date)}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => { setCompareSelected([]); }}
                      className="w-full mt-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748B' }}
                    >
                      Choose Different Photos
                    </button>
                  </div>
                )
              })()}

              {/* ── Photo grid ── */}
              {(!compareMode || compareSelected.length < 2) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((m: any, i: number) => {
                    const isSelected = compareSelected.includes(i)
                    const selIndex = compareSelected.indexOf(i)

                    return (
                      <div
                        key={i}
                        className="relative rounded-2xl overflow-hidden cursor-pointer"
                        style={{ aspectRatio: '3/4', outline: isSelected ? '2.5px solid #BB5CF6' : 'none', outlineOffset: '2px' }}
                        onClick={() => {
                          if (!compareMode) return
                          if (isSelected) {
                            setCompareSelected(prev => prev.filter(x => x !== i))
                          } else if (compareSelected.length < 2) {
                            setCompareSelected(prev => [...prev, i])
                          }
                        }}
                      >
                        <img src={m.photo_url?.startsWith('http') ? m.photo_url : (signedPhotoUrls[m.photo_url] || '')} alt={m.date} className="w-full h-full object-cover" />

                        {/* Selection badge */}
                        {compareMode && isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center font-heading font-black text-xs text-white"
                            style={{ background: '#BB5CF6', boxShadow: '0 0 10px rgba(187,92,246,0.5)' }}>
                            {selIndex + 1}
                          </div>
                        )}

                        {/* Compare mode overlay hint */}
                        {compareMode && !isSelected && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: 'rgba(187,92,246,0.6)' }}>
                              <span className="font-heading text-xs" style={{ color: '#BB5CF6' }}>{compareSelected.length + 1}</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                          <p className="font-heading text-xs text-white">
                            {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                          {m.weight_kg && <p className="font-heading text-[10px]" style={{ color: '#D88BFF' }}>{m.weight_kg} kg</p>}
                        </div>
                      </div>
                    )
                  })}

                  {/* Add photo tile */}
                  {!compareMode && (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                      style={{ aspectRatio: '3/4', background: 'rgba(187,92,246,0.06)', border: '2px dashed rgba(187,92,246,0.2)' }}
                    >
                      <Camera size={20} style={{ color: '#BB5CF6' }} />
                      <span className="font-heading text-xs" style={{ color: '#BB5CF6' }}>Add photo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* InBody Tab */}
      {activeTab === 'inbody' && (
        <div className="mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText size={20} style={{ color: '#BB5CF6' }} />
              <div>
                <p className="font-heading font-black text-sm text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>INBODY SCAN</p>
                <p className="font-heading text-xs" style={{ color: '#475569' }}>Body composition analysis report</p>
              </div>
              {inbodyUrl && !uploadingInbody && !analyzingInbody && (
                <CheckCircle size={16} style={{ color: '#10B981' }} className="ml-auto" />
              )}
            </div>

            {/* Upload / Analyzing state */}
            {(uploadingInbody || analyzingInbody) && (
              <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
                style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.2)' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: '#BB5CF6', flexShrink: 0 }} />
                <div>
                  <p className="font-heading font-semibold text-xs text-white">
                    {uploadingInbody ? 'Uploading scan...' : 'Ion is analyzing your scan...'}
                  </p>
                  <p className="font-heading text-xs mt-0.5" style={{ color: '#64748B' }}>
                    {analyzingInbody ? 'Extracting body composition data with AI — this takes a few seconds.' : 'Saving to your profile.'}
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {inbodyError && !uploadingInbody && !analyzingInbody && (
              <div className="p-4 rounded-xl mb-4"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} style={{ color: '#EF4444' }} />
                  <p className="font-heading font-semibold text-xs" style={{ color: '#EF4444' }}>Analysis Error</p>
                </div>
                <p className="font-heading text-xs mb-3 leading-relaxed" style={{ color: '#94A3B8' }}>{inbodyError}</p>
                {inbodyUrl && (
                  <button
                    onClick={() => analyzeInbody(inbodyUrl)}
                    className="flex items-center gap-1.5 font-heading text-xs font-semibold transition-colors"
                    style={{ color: '#BB5CF6' }}
                  >
                    <RefreshCw size={12} /> Try Analysis Again
                  </button>
                )}
              </div>
            )}

            {/* Analysis results */}
            {inbodyAnalysis && !uploadingInbody && !analyzingInbody && (
              <div className="p-4 rounded-xl mb-4"
                style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.2)' }}>
                <p className="font-heading font-semibold text-xs mb-3" style={{ color: '#BB5CF6' }}>Ion Analysis</p>

                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Body Fat', value: inbodyAnalysis.body_fat_pct, unit: '%' },
                    { label: 'Muscle Mass', value: inbodyAnalysis.muscle_mass_kg, unit: 'kg' },
                    { label: 'BMR', value: inbodyAnalysis.bmr_kcal, unit: 'kcal' },
                    { label: 'Visceral Fat', value: inbodyAnalysis.visceral_fat, unit: '' },
                    { label: 'Body Weight', value: inbodyAnalysis.body_weight_kg, unit: 'kg' },
                    { label: 'InBody Score', value: inbodyAnalysis.inbody_score, unit: '' },
                  ].filter(item => item.value != null).map(item => (
                    <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="font-heading text-[10px] mb-0.5" style={{ color: '#475569' }}>{item.label}</p>
                      <p className="font-heading font-bold text-sm text-white">
                        {item.value}
                        {item.unit && <span className="text-xs font-normal ml-0.5" style={{ color: '#475569' }}>{item.unit}</span>}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Segmental analysis */}
                {inbodyAnalysis.segmental && Object.values(inbodyAnalysis.segmental).some(v => v != null) && (
                  <div className="mb-3">
                    <p className="font-heading text-[10px] tracking-wider uppercase mb-2" style={{ color: '#475569' }}>Segmental Muscle (kg)</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'L. Arm', value: inbodyAnalysis.segmental?.left_arm_kg },
                        { label: 'R. Arm', value: inbodyAnalysis.segmental?.right_arm_kg },
                        { label: 'Trunk', value: inbodyAnalysis.segmental?.trunk_kg },
                        { label: 'L. Leg', value: inbodyAnalysis.segmental?.left_leg_kg },
                        { label: 'R. Leg', value: inbodyAnalysis.segmental?.right_leg_kg },
                      ].filter(s => s.value != null).map(s => (
                        <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="font-heading text-[9px]" style={{ color: '#475569' }}>{s.label}</p>
                          <p className="font-heading font-bold text-xs text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coaching summary */}
                {inbodyAnalysis.coaching_summary && (
                  <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                    {inbodyAnalysis.coaching_summary}
                  </p>
                )}
              </div>
            )}

            {/* Scan on file */}
            {inbodyUrl && !uploadingInbody ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="font-heading text-xs font-semibold mb-2" style={{ color: '#10B981' }}>✓ InBody scan on file</p>
                  {inbodyUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img src={inbodyUrl} alt="InBody scan" className="w-full rounded-lg object-contain max-h-80" />
                  ) : (
                    <a href={inbodyUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-heading font-semibold text-xs w-fit transition-all"
                      style={{ background: 'rgba(187,92,246,0.1)', border: '1px solid rgba(187,92,246,0.2)', color: '#D88BFF' }}>
                      <FileText size={13} /> View PDF Report
                    </a>
                  )}
                </div>

                {/* Analyse button (if no analysis yet and not analyzing) */}
                {!inbodyAnalysis && !analyzingInbody && !inbodyError && (
                  <button
                    onClick={() => analyzeInbody(inbodyUrl)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-semibold text-xs w-fit transition-all"
                    style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)', color: '#BB5CF6' }}
                  >
                    Analyze with Ion
                  </button>
                )}

                <div>
                  <p className="font-heading text-xs mb-3" style={{ color: '#475569' }}>Upload a newer scan to replace it:</p>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer font-heading font-semibold text-xs w-fit transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                    <Upload size={13} />
                    {uploadingInbody ? 'Uploading...' : 'Replace Scan'}
                    <input ref={inbodyInputRef} type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadInbody(e.target.files[0])} />
                  </label>
                </div>
              </div>
            ) : !uploadingInbody && !analyzingInbody && (
              <div className="flex flex-col gap-5">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="font-heading font-semibold text-xs text-white mb-2">📊 Why upload an InBody scan?</p>
                  <ul className="flex flex-col gap-1.5">
                    {[
                      'Exact muscle mass & fat mass values',
                      'Ion can fine-tune your calorie & protein targets',
                      'Track body recomposition (not just weight)',
                      'Identify muscle imbalances between sides',
                    ].map(t => (
                      <li key={t} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>-</span>
                        <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <label className="flex flex-col items-center gap-4 p-8 rounded-2xl cursor-pointer transition-all"
                  style={{ border: '2px dashed rgba(187,92,246,0.25)', background: 'rgba(187,92,246,0.04)' }}>
                  <Upload size={32} style={{ color: '#BB5CF6' }} />
                  <div className="text-center">
                    <p className="font-heading font-bold text-sm text-white mb-1">Upload InBody Scan</p>
                    <p className="font-heading text-xs" style={{ color: '#475569' }}>
                      Photo of your report or PDF - Any InBody model
                    </p>
                  </div>
                  <input ref={inbodyInputRef} type="file" accept="image/*,.pdf" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadInbody(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {measurements.length > 0 && activeTab === 'stats' && (
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.14em' }}>HISTORY</p>
          <div className="flex flex-col gap-2">
            {measurements.map((m, i) => {
              const key = m.id || String(i)
              const expanded = expandedRows.has(key)
              return (
                <div key={key} className="rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => {
                      const next = new Set(expandedRows)
                      next.has(key) ? next.delete(key) : next.add(key)
                      setExpandedRows(next)
                    }}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-heading font-bold text-xs text-white">
                          {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {i === 0 && <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#D88BFF' }}>Latest</span>}
                      </div>
                      {m.weight_kg && <span className="font-heading font-bold text-sm text-white">{m.weight_kg} kg</span>}
                      {m.photo_url && <Camera size={12} style={{ color: '#BB5CF6' }} />}
                    </div>
                    {expanded ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {FIELDS.filter(f => m[f.key] != null).map(field => (
                        <div key={field.key} className="py-2">
                          <p className="font-heading text-[10px]" style={{ color: '#475569' }}>{field.label}</p>
                          <p className="font-heading font-bold text-xs text-white">{m[field.key]} {field.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && measurements.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Ruler size={32} style={{ color: '#2D3748', margin: '0 auto 12px' }} />
          <p className="font-heading font-bold text-lg text-white mb-2">No measurements yet</p>
          <p className="font-heading text-sm mb-4" style={{ color: '#64748B' }}>Start tracking today to see your progress over time.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus size={14} /> Log Your First Measurement
          </button>
        </div>
      )}
    </div>
  )
}
