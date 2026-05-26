'use client'

import { useState } from 'react'
import { Send, Crown, Ban, RotateCcw, ChevronDown, X, Check, Loader } from 'lucide-react'

interface Props {
  userId: string
  email: string
  name?: string
  currentTier: string
  currentStatus: string
}

type Panel = 'tier' | 'email' | null

const TIER_OPTIONS = [
  { value: 'elite',     label: 'Elite',     color: '#D88BFF' },
  { value: 'pro',       label: 'Pro',       color: '#BB5CF6' },
  { value: 'free',      label: 'Starter',   color: '#475569' },
]

const TEMPLATE_OPTIONS = [
  { value: 'custom',               label: 'Custom message' },
  { value: 'welcome',              label: 'Welcome' },
  { value: 'onboarding_reminder',  label: 'Onboarding reminder' },
  { value: 'trial_started',        label: 'Trial started' },
  { value: 'trial_ending_day5',    label: 'Trial ending — 2 days' },
  { value: 'trial_ending_day6',    label: 'Trial ending — last day' },
  { value: 'upgrade_confirmation', label: 'Upgrade confirmation' },
  { value: 'subscription_cancelled', label: 'Subscription cancelled' },
  { value: 'payment_failed',       label: 'Payment failed' },
  { value: 'plan_error_resolved',  label: 'Plan error resolved' },
  { value: 'onboarding_error',     label: 'Onboarding error' },
]

export function AdminUserActions({ userId, email, name, currentTier, currentStatus }: Props) {
  const [panel,    setPanel]    = useState<Panel>(null)
  const [busy,     setBusy]     = useState(false)
  const [toast,    setToast]    = useState<{ ok: boolean; msg: string } | null>(null)

  // Subscription panel state
  const [subAction, setSubAction] = useState<'grant' | 'set_trial' | 'revoke' | 'reset'>('grant')
  const [newTier,   setNewTier]   = useState('pro')

  // Email panel state
  const [template,  setTemplate]  = useState('custom')
  const [subject,   setSubject]   = useState('')
  const [msgBody,   setMsgBody]   = useState('')
  const [tplName,   setTplName]   = useState(name || '')

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSubAction() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: subAction, tier: newTier }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Unknown error')
      showToast(true, `Done: ${subAction} → ${newTier}`)
      setPanel(null)
    } catch (err: any) {
      showToast(false, err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSendEmail() {
    if (template === 'custom' && !subject.trim()) { showToast(false, 'Subject required'); return }
    if (template === 'custom' && !msgBody.trim())  { showToast(false, 'Message required'); return }
    setBusy(true)
    try {
      const body: Record<string, any> = { to: email }
      if (template === 'custom') {
        body.subject = subject.trim()
        body.message = msgBody.trim()
      } else {
        body.type = template
        body.data = {
          name: tplName.trim() || name || 'there',
          planName: currentTier === 'elite' ? 'Elite' : 'Pro',
          onboardingUrl: `${window.location.origin}/onboarding`,
          daysSince: 3,
        }
      }
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Send failed')
      showToast(true, 'Email sent!')
      setPanel(null)
    } catch (err: any) {
      showToast(false, err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">

        {/* Subscription management */}
        <button
          onClick={() => setPanel(p => p === 'tier' ? null : 'tier')}
          title="Manage subscription"
          className="flex items-center gap-1 px-2 py-1 rounded-lg font-heading text-[10px] font-bold transition-all"
          style={{
            background: panel === 'tier' ? 'rgba(187,92,246,0.18)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: panel === 'tier' ? '#D88BFF' : '#64748B',
          }}>
          <Crown size={10} />
          Plan
        </button>

        {/* Send email */}
        <button
          onClick={() => setPanel(p => p === 'email' ? null : 'email')}
          title="Send email"
          className="flex items-center gap-1 px-2 py-1 rounded-lg font-heading text-[10px] font-bold transition-all"
          style={{
            background: panel === 'email' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: panel === 'email' ? '#60A5FA' : '#64748B',
          }}>
          <Send size={10} />
          Email
        </button>

      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute left-0 z-50 mt-1 font-heading text-[10px] px-3 py-1.5 rounded-xl whitespace-nowrap"
          style={{
            background: toast.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: toast.ok ? '#10B981' : '#EF4444',
            top: '100%',
          }}>
          {toast.ok ? <Check size={10} className="inline mr-1" /> : <X size={10} className="inline mr-1" />}
          {toast.msg}
        </div>
      )}

      {/* Subscription panel */}
      {panel === 'tier' && (
        <div className="absolute left-0 z-40 mt-1 w-72 rounded-xl p-4 space-y-3"
          style={{ background: '#0E0E1A', border: '1px solid rgba(187,92,246,0.25)', top: '100%' }}>
          <div className="flex items-center justify-between">
            <p className="font-heading text-xs font-bold" style={{ color: '#D88BFF' }}>
              Subscription — <span style={{ color: '#64748B' }}>{email}</span>
            </p>
            <button onClick={() => setPanel(null)} style={{ color: '#475569' }}><X size={12} /></button>
          </div>

          <p className="font-heading text-[10px]" style={{ color: '#475569' }}>
            Current: <span style={{ color: '#94A3B8' }}>{currentStatus} / {currentTier}</span>
          </p>

          {/* Action picker */}
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1 block" style={{ color: '#475569' }}>ACTION</label>
            <div className="relative">
              <select value={subAction} onChange={e => setSubAction(e.target.value as any)}
                className="w-full rounded-lg px-3 py-2 font-heading text-xs text-white appearance-none outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="grant">Grant access (set active)</option>
                <option value="set_trial">Start 7-day trial</option>
                <option value="revoke">Revoke access (cancel)</option>
                <option value="reset">Reset to free / starter</option>
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
            </div>
          </div>

          {/* Tier picker (not for revoke/reset) */}
          {(subAction === 'grant' || subAction === 'set_trial') && (
            <div>
              <label className="font-heading text-[10px] tracking-widest mb-1 block" style={{ color: '#475569' }}>TIER</label>
              <div className="flex gap-2">
                {TIER_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => setNewTier(t.value)}
                    className="flex-1 py-1.5 rounded-lg font-heading text-[10px] font-bold transition-all"
                    style={{
                      background: newTier === t.value ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${newTier === t.value ? `${t.color}55` : 'rgba(255,255,255,0.06)'}`,
                      color: newTier === t.value ? t.color : '#475569',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm button */}
          <button onClick={handleSubAction} disabled={busy}
            className="w-full py-2 rounded-xl font-heading text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'rgba(187,92,246,0.15)',
              border: '1px solid rgba(187,92,246,0.3)',
              color: busy ? '#6D28D9' : '#D88BFF',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}>
            {busy ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
            {busy ? 'Applying…' : 'Confirm'}
          </button>
        </div>
      )}

      {/* Email panel */}
      {panel === 'email' && (
        <div className="absolute left-0 z-40 mt-1 w-80 rounded-xl p-4 space-y-3"
          style={{ background: '#0E0E1A', border: '1px solid rgba(59,130,246,0.25)', top: '100%' }}>
          <div className="flex items-center justify-between">
            <p className="font-heading text-xs font-bold" style={{ color: '#60A5FA' }}>
              Email — <span style={{ color: '#64748B', fontSize: 10 }}>{email}</span>
            </p>
            <button onClick={() => setPanel(null)} style={{ color: '#475569' }}><X size={12} /></button>
          </div>

          {/* Template */}
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1 block" style={{ color: '#475569' }}>TEMPLATE</label>
            <div className="relative">
              <select value={template} onChange={e => setTemplate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-heading text-xs text-white appearance-none outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {TEMPLATE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
            </div>
          </div>

          {template === 'custom' ? (
            <>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
                className="w-full rounded-lg px-3 py-2 font-heading text-xs text-white placeholder:text-slate-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
              <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={4} placeholder="Message body"
                className="w-full rounded-lg px-3 py-2 font-heading text-xs text-white placeholder:text-slate-600 outline-none resize-y"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </>
          ) : (
            <input value={tplName} onChange={e => setTplName(e.target.value)}
              placeholder={`Recipient name (default: ${name || 'there'})`}
              className="w-full rounded-lg px-3 py-2 font-heading text-xs text-white placeholder:text-slate-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          )}

          <button onClick={handleSendEmail} disabled={busy}
            className="w-full py-2 rounded-xl font-heading text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: busy ? '#1E40AF' : '#60A5FA',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}>
            {busy ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}
