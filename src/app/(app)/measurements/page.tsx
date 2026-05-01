'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, Ruler, ChevronDown, ChevronUp, Camera, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react'

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

// Symmetry pairs [left key, right key, label]
const SYMMETRY_PAIRS = [
  ['bicep_left_cm', 'bicep_right_cm', 'Biceps'],
  ['thigh_left_cm', 'thigh_right_cm', 'Thighs'],
  ['calf_left_cm', 'calf_right_cm', 'Calves'],
]

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'stats' | 'symmetry' | 'photos'>('stats')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadMeasurements() }, [])

  async function loadMeasurements() {
    const res = await fetch('/api/measurements')
    const data = await res.json()
    setMeasurements(data.measurements || [])
    setLoading(false)
  }

  async function saveMeasurement() {
    if (!form.weight_kg) return
    setSaving(true)

    const payload: Record<string, any> = { date: new Date().toISOString().split('T')[0] }
    FIELDS.forEach(f => {
      if (form[f.key]) payload[f.key] = parseFloat(form[f.key])
    })

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

      const { data, error } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { upsert: false })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(data.path)

      // Save photo URL to latest measurement or as a standalone record
      const today = new Date().toISOString().split('T')[0]
      const latest = measurements[0]

      if (latest && latest.date === today) {
        await supabase.from('measurements').update({ photo_url: publicUrl }).eq('id', latest.id)
      } else {
        await supabase.from('measurements').insert({ user_id: user.id, date: today, photo_url: publicUrl })
      }

      loadMeasurements()
    } catch (err) {
      console.error('Photo upload failed:', err)
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

  // Symmetry gaps
  const symmetryData = SYMMETRY_PAIRS.map(([lk, rk, label]) => {
    const l = latest?.[lk]
    const r = latest?.[rk]
    const gap = l != null && r != null ? Math.abs(l - r).toFixed(1) : null
    const dominant = l != null && r != null ? (l > r ? 'Left' : r > l ? 'Right' : 'Even') : null
    const isGood = gap != null && parseFloat(gap) <= 0.5
    return { label, l, r, gap, dominant, isGood }
  })

  // Photos from measurements
  const photos = measurements.filter((m: any) => m.photo_url)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#7C3AED', letterSpacing: '0.14em' }}>BODY TRACKING</p>
          <h1 className="font-heading font-bold text-2xl text-white">Measurements</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all"
            style={{ background: 'rgba(34,211,238,0.1)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}
          >
            <Camera size={13} /> {uploadingPhoto ? '...' : 'Photo'}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadProgressPhoto(e.target.files[0])} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold text-xs tracking-wider transition-all"
            style={{ background: '#7C3AED', color: 'white', letterSpacing: '0.08em', boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}
          >
            <Plus size={13} /> LOG
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass-card p-5 mb-6" style={{ border: '1px solid rgba(124,58,237,0.25)' }}>
          <p className="font-heading font-bold text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.08em' }}>
            TODAY'S MEASUREMENTS
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {FIELDS.map(field => (
              <div key={field.key}>
                <label className="font-heading text-[10px] tracking-wider block mb-1" style={{ color: '#475569' }}>
                  {field.icon} {field.label} ({field.unit})
                  {field.key === 'weight_kg' && <span style={{ color: '#7C3AED' }}> *</span>}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form[field.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="—"
                  className="w-full rounded-lg px-3 py-2 font-heading text-sm outline-none transition-all"
                  style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F0FF' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.5)' }}
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
              style={{ background: form.weight_kg ? '#7C3AED' : 'rgba(255,255,255,0.05)', color: form.weight_kg ? 'white' : '#2D3748', letterSpacing: '0.08em', boxShadow: form.weight_kg ? '0 0 16px rgba(124,58,237,0.3)' : 'none' }}
            >
              {saving ? 'SAVING...' : 'SAVE MEASUREMENTS'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({}) }} className="px-4 py-2.5 rounded-xl font-heading text-xs font-semibold" style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {measurements.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['stats', 'symmetry', 'photos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-1.5 rounded-lg font-heading font-semibold text-xs capitalize transition-all"
              style={{
                background: activeTab === t ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: activeTab === t ? '#A78BFA' : '#64748B',
                border: activeTab === t ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
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
            LATEST — {new Date(latest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
          <div className="glass-card p-5" style={{ borderColor: 'rgba(124,58,237,0.15)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight size={16} style={{ color: '#7C3AED' }} />
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
                      {isGood ? '✓ Balanced' : `⚠ ${gap}cm gap`}
                    </span>
                  )}
                </div>
                {l != null && r != null ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>Left</span>
                          <span className="font-heading text-xs font-bold text-white">{l} cm</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${(l / Math.max(l, r)) * 100}%`, background: '#7C3AED' }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>Right</span>
                          <span className="font-heading text-xs font-bold text-white">{r} cm</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${(r / Math.max(l, r)) * 100}%`, background: '#22D3EE' }} />
                        </div>
                      </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((m: any, i: number) => (
                <div key={i} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  <img src={m.photo_url} alt={m.date} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                    <p className="font-heading text-xs text-white">
                      {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    {m.weight_kg && <p className="font-heading text-[10px]" style={{ color: '#A78BFA' }}>{m.weight_kg} kg</p>}
                  </div>
                </div>
              ))}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                style={{ aspectRatio: '3/4', background: 'rgba(124,58,237,0.06)', border: '2px dashed rgba(124,58,237,0.2)' }}
              >
                <Camera size={20} style={{ color: '#7C3AED' }} />
                <span className="font-heading text-xs" style={{ color: '#7C3AED' }}>Add photo</span>
              </button>
            </div>
          )}
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
                <div key={key} className="rounded-2xl overflow-hidden" style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => { const next = new Set(expandedRows); next.has(key) ? next.delete(key) : next.add(key); setExpandedRows(next) }}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-heading font-bold text-xs text-white">
                          {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {i === 0 && <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>Latest</span>}
                      </div>
                      {m.weight_kg && <span className="font-heading font-bold text-sm text-white">{m.weight_kg} kg</span>}
                      {m.photo_url && <Camera size={12} style={{ color: '#22D3EE' }} />}
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
