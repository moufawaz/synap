'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, Ruler, Scale, ChevronDown, ChevronUp } from 'lucide-react'

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

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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

    const payload: Record<string, any> = {
      date: new Date().toISOString().split('T')[0],
    }
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

  const latest = measurements[0]
  const prev = measurements[1]

  function getDelta(key: string): string | null {
    if (!latest || !prev) return null
    const a = latest[key], b = prev[key]
    if (a == null || b == null) return null
    const d = (a - b).toFixed(1)
    return (Number(d) > 0 ? '+' : '') + d
  }

  function deltaColor(key: string): string {
    const d = getDelta(key)
    if (!d) return '#475569'
    const n = parseFloat(d)
    if (key === 'weight_kg' || key === 'body_fat_pct' || key === 'waist_cm') {
      return n < 0 ? '#10B981' : '#F97316'
    }
    return n > 0 ? '#10B981' : '#F97316'
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>BODY TRACKING</p>
          <h1 className="font-heading font-black text-2xl text-white tracking-wider" style={{ letterSpacing: '0.06em' }}>Measurements</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold text-xs tracking-wider transition-all"
          style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.08em', boxShadow: '0 0 16px rgba(187,92,246,0.3)' }}
        >
          <Plus size={14} />
          LOG TODAY
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass-card p-5 mb-6" style={{ border: '1px solid rgba(187,92,246,0.2)' }}>
          <p className="font-heading font-black text-sm text-white mb-4 tracking-wider" style={{ letterSpacing: '0.08em' }}>
            TODAY'S MEASUREMENTS
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {FIELDS.map(field => (
              <div key={field.key}>
                <label className="font-heading text-[10px] tracking-wider block mb-1" style={{ color: '#475569' }}>
                  {field.icon} {field.label} ({field.unit})
                  {field.key === 'weight_kg' && <span style={{ color: '#BB5CF6' }}> *</span>}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form[field.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="—"
                  className="w-full rounded-lg px-3 py-2 font-heading text-sm outline-none"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#E2E8F0' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(187,92,246,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveMeasurement}
              disabled={!form.weight_kg || saving}
              className="flex-1 py-2.5 rounded-xl font-heading font-black text-xs tracking-wider transition-all"
              style={{ background: form.weight_kg ? '#BB5CF6' : 'rgba(255,255,255,0.05)', color: form.weight_kg ? 'white' : '#2D3748', letterSpacing: '0.08em' }}
            >
              {saving ? 'SAVING...' : 'SAVE MEASUREMENTS'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({}) }}
              className="px-4 py-2.5 rounded-xl font-heading text-xs font-semibold"
              style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current stats */}
      {latest && (
        <div className="mb-6">
          <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.14em' }}>
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
                  <p className="font-heading font-black text-xl text-white">
                    {latest[field.key]}
                    <span className="text-xs font-normal ml-1" style={{ color: '#475569' }}>{field.unit}</span>
                  </p>
                  {delta && (
                    <p className="font-heading text-xs font-semibold mt-0.5" style={{ color: deltaColor(field.key) }}>
                      {delta} {field.unit}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      {measurements.length > 0 && (
        <div>
          <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.14em' }}>
            HISTORY
          </p>
          <div className="flex flex-col gap-2">
            {measurements.map((m, i) => {
              const key = m.id || String(i)
              const expanded = expandedRows.has(key)
              return (
                <div key={key} className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => {
                      const next = new Set(expandedRows)
                      next.has(key) ? next.delete(key) : next.add(key)
                      setExpandedRows(next)
                    }}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-heading font-bold text-xs text-white text-left">
                          {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {i === 0 && (
                          <span className="font-heading text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(187,92,246,0.1)', color: '#BB5CF6' }}>
                            Latest
                          </span>
                        )}
                      </div>
                      {m.weight_kg && (
                        <span className="font-heading font-black text-sm text-white">{m.weight_kg} kg</span>
                      )}
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
          <p className="font-heading font-black text-lg text-white mb-2">No measurements yet</p>
          <p className="font-heading text-sm" style={{ color: '#475569' }}>Start tracking today to see your progress over time.</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4 text-sm"
          >
            <Plus size={14} /> Log Your First Measurement
          </button>
        </div>
      )}
    </div>
  )
}
