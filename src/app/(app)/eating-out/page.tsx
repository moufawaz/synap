'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Loader2, MapPin, Search, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react'

export const dynamic = 'force-dynamic'

const EXAMPLES = [
  'Chipotle after workout',
  'Italian restaurant dinner',
  'Airport food court',
  'Sushi delivery',
  'Al Baik',
  'Hotel breakfast buffet',
]

export default function EatingOutPage() {
  const [situation, setSituation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  async function askIon(value = situation) {
    const text = value.trim()
    if (!text) {
      setError('Tell Ion where or what you are ordering.')
      return
    }
    setSituation(text)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/eating-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate order guidance')
      setResult(data.recommendation)
    } catch (err: any) {
      setError(err?.message || 'Could not generate order guidance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <div className="mb-6">
        <p className="font-heading text-xs tracking-widest uppercase mb-1" style={{ color: '#F97316', letterSpacing: '0.14em' }}>EATING OUT MODE</p>
        <h1 className="font-heading font-bold text-2xl text-white">Smart Order Coach</h1>
        <p className="font-heading text-sm mt-2 max-w-xl" style={{ color: '#64748B' }}>
          Type any restaurant, cuisine, delivery app, buffet, cafe, or travel situation. Ion fits the best order to your remaining macros.
        </p>
      </div>

      <div className="glass-card p-5 mb-5">
        <label className="block">
          <span className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: '#94A3B8' }}>Where are you ordering?</span>
          <div className="mt-2 flex gap-2">
            <input
              value={situation}
              onChange={event => setSituation(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') askIon() }}
              className="flex-1 rounded-xl px-4 py-3 font-heading text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
              placeholder="e.g. sushi delivery, airport breakfast, Chipotle..."
            />
            <button
              onClick={() => askIon()}
              disabled={loading}
              className="rounded-xl px-4 py-3 font-heading font-bold text-xs flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#F97316,#BB5CF6)', color: '#fff' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              ASK
            </button>
          </div>
        </label>

        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLES.map(example => (
            <button
              key={example}
              onClick={() => askIon(example)}
              className="px-3 py-1.5 rounded-full font-heading text-xs font-semibold"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#F97316' }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="glass-card p-5" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <p className="font-heading text-xs font-bold tracking-widest uppercase" style={{ color: '#10B981' }}>Best order</p>
                <h2 className="font-heading text-xl font-bold text-white mt-1">{result.best_order?.title}</h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#64748B' }}>{result.best_order?.why}</p>
                <MacroRow macros={result.best_order?.estimated_macros} />
                <ul className="mt-4 space-y-2">
                  {(result.best_order?.items || []).map((item: string) => (
                    <li key={item} className="flex gap-2 text-sm" style={{ color: '#CBD5E1' }}>
                      <UtensilsCrossed size={14} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard title="Backup order" icon={<ShieldCheck size={16} />} tone="#BB5CF6">
              <p className="font-heading text-sm font-bold text-white mb-2">{result.backup_order?.title}</p>
              <MacroRow macros={result.backup_order?.estimated_macros} compact />
            </InfoCard>
            <InfoCard title="Context note" icon={<MapPin size={16} />} tone="#F97316">
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{result.context_note}</p>
            </InfoCard>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ListCard title="Avoid or limit" items={result.avoid || []} tone="#EF4444" />
            <ListCard title="Portion rules" items={result.portion_rules || []} tone="#3B82F6" />
          </div>

          <div className="glass-card p-4">
            <p className="font-heading text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#94A3B8' }}>How to log it</p>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{result.how_to_log}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MacroRow({ macros, compact = false }: { macros?: any; compact?: boolean }) {
  if (!macros) return null
  const entries = [
    ['kcal', macros.calories, '#F97316'],
    ['protein', macros.protein_g, '#BB5CF6'],
    ['carbs', macros.carbs_g, '#3B82F6'],
    ['fat', macros.fat_g, '#F59E0B'],
  ]
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-4'}`}>
      {entries.map(([label, value, color]) => (
        <span key={label} className="font-heading text-xs px-2 py-1 rounded-lg" style={{ background: `${color}1A`, color: String(color), border: `1px solid ${color}33` }}>
          {Math.round(Number(value) || 0)} {label}
        </span>
      ))}
    </div>
  )
}

function InfoCard({ title, icon, tone, children }: { title: string; icon: ReactNode; tone: string; children: ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3" style={{ color: tone }}>
        {icon}
        <p className="font-heading text-xs font-bold tracking-widest uppercase">{title}</p>
      </div>
      {children}
    </div>
  )
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="glass-card p-4">
      <p className="font-heading text-xs font-bold tracking-widest uppercase mb-3" style={{ color: tone }}>{title}</p>
      <div className="space-y-2">
        {items.map(item => (
          <p key={item} className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>- {item}</p>
        ))}
      </div>
    </div>
  )
}
