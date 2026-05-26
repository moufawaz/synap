'use client'

import { useState } from 'react'
import { Send, Users, User, ChevronDown } from 'lucide-react'

const TEMPLATE_OPTIONS = [
  { value: 'custom',                  label: 'Custom message (compose below)' },
  { value: 'welcome',                 label: 'Welcome — Ion is ready' },
  { value: 'onboarding_reminder',     label: 'Onboarding reminder (day 1–3)' },
  { value: 'onboarding_reminder_7d',  label: 'Onboarding reminder (7-day)' },
  { value: 'trial_started',           label: 'Trial started (7-day free)' },
  { value: 'trial_ending_day5',       label: 'Trial ending — 2 days left' },
  { value: 'trial_ending_day6',       label: 'Trial ending — last day' },
  { value: 'trial_cancelled',         label: 'Trial cancelled confirmation' },
  { value: 'subscription_cancelled',  label: 'Subscription cancelled' },
  { value: 'subscription_renewed',    label: 'Subscription renewed' },
  { value: 'payment_failed',          label: 'Payment failed — action needed' },
  { value: 'upgrade_confirmation',    label: 'Upgrade confirmation' },
  { value: 'weekly_report',           label: 'Weekly body composition report' },
  { value: 'plan_renewal_warning',    label: 'Plan renewal warning (3 days)' },
  { value: 'new_plan',                label: 'New plan generated' },
  { value: 'milestone',               label: 'Milestone unlocked' },
  { value: 'onboarding_error',        label: 'Onboarding error (apology)' },
  { value: 'plan_error_resolved',     label: 'Plan error resolved' },
]

interface Props {
  users: { id: string; email: string; name?: string; tier?: string }[]
}

type Mode = 'single' | 'bulk'

export function AdminEmailComposer({ users }: Props) {
  const [mode,      setMode]      = useState<Mode>('single')
  const [toEmail,   setToEmail]   = useState('')
  const [bulkTier,  setBulkTier]  = useState('')
  const [bulkStatus,setBulkStatus]= useState('')
  const [template,  setTemplate]  = useState('custom')
  const [subject,   setSubject]   = useState('')
  const [message,   setMessage]   = useState('')
  // Template data fields
  const [tplName,   setTplName]   = useState('')
  const [tplExtra,  setTplExtra]  = useState('')
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<{ ok: boolean; succeeded?: number; failed?: number; error?: string } | null>(null)

  const isCustom = template === 'custom'

  async function handleSend() {
    if (!template) return
    if (mode === 'single' && !toEmail.trim()) { alert('Enter a recipient email.'); return }
    if (isCustom && !subject.trim()) { alert('Enter a subject.'); return }
    if (isCustom && !message.trim()) { alert('Enter a message.'); return }

    setSending(true)
    setResult(null)
    try {
      const body: Record<string, any> = { template }

      if (mode === 'single') {
        body.to = toEmail.trim()
      } else {
        body.toAll = true
        if (bulkTier)   body.tier   = bulkTier
        if (bulkStatus) body.status = bulkStatus
      }

      if (isCustom) {
        body.subject = subject.trim()
        body.message = message.trim()
      } else {
        body.type = template
        body.data = {
          name: tplName.trim() || 'there',
          planName: tplExtra.trim() || 'Pro',
          daysSince: 3,
          onboardingUrl: `${window.location.origin}/onboarding`,
        }
      }

      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      setResult({ ok: false, error: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Mode switcher */}
      <div className="flex gap-2">
        {(['single', 'bulk'] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-xs font-bold tracking-wider"
            style={{
              background: mode === m ? 'rgba(187,92,246,0.16)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: mode === m ? '#D88BFF' : '#64748B',
            }}>
            {m === 'single' ? <User size={12} /> : <Users size={12} />}
            {m === 'single' ? 'Single user' : 'Bulk'}
          </button>
        ))}
      </div>

      {/* Recipient */}
      {mode === 'single' ? (
        <div>
          <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>RECIPIENT</label>
          <div className="relative">
            <input
              list="admin-email-list"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="user@example.com or pick from list"
              className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white placeholder:text-slate-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <datalist id="admin-email-list">
              {users.map(u => (
                <option key={u.id} value={u.email}>{u.name ? `${u.name} (${u.email})` : u.email}</option>
              ))}
            </datalist>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>FILTER BY TIER (optional)</label>
            <div className="relative">
              <select value={bulkTier} onChange={e => setBulkTier(e.target.value)}
                className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white appearance-none outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="">All tiers</option>
                <option value="elite">Elite</option>
                <option value="pro">Pro</option>
                <option value="free">Free / Starter</option>
              </select>
              <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
            </div>
          </div>
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>FILTER BY STATUS (optional)</label>
            <div className="relative">
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white appearance-none outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="">Any status</option>
                <option value="active">Active (paid)</option>
                <option value="trial">In trial</option>
                <option value="cancelled">Cancelled</option>
                <option value="free">Free</option>
              </select>
              <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
            </div>
          </div>
          <p className="col-span-2 font-heading text-[10px]" style={{ color: '#334155' }}>
            Leave both empty to send to ALL users ({users.length} total). Add filters to narrow recipients.
          </p>
        </div>
      )}

      {/* Template selector */}
      <div>
        <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>EMAIL TEMPLATE</label>
        <div className="relative">
          <select value={template} onChange={e => setTemplate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white appearance-none outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {TEMPLATE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#475569' }} />
        </div>
      </div>

      {/* Template data or Custom compose */}
      {isCustom ? (
        <div className="space-y-3">
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>SUBJECT</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. A quick update from Ion"
              className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white placeholder:text-slate-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>MESSAGE</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message here. Plain text is fine — line breaks are preserved."
              className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white placeholder:text-slate-600 outline-none resize-y"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>RECIPIENT NAME (for template)</label>
            <input
              value={tplName}
              onChange={e => setTplName(e.target.value)}
              placeholder="e.g. Ahmed"
              className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white placeholder:text-slate-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <div>
            <label className="font-heading text-[10px] tracking-widest mb-1.5 block" style={{ color: '#475569' }}>PLAN NAME (if applicable)</label>
            <input
              value={tplExtra}
              onChange={e => setTplExtra(e.target.value)}
              placeholder="e.g. Elite, Pro Monthly"
              className="w-full rounded-xl px-4 py-3 font-heading text-sm text-white placeholder:text-slate-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <p className="col-span-2 font-heading text-[10px]" style={{ color: '#334155' }}>
            Template variables are pre-filled with defaults where not provided. Preview in dev by checking your inbox.
          </p>
        </div>
      )}

      {/* Send button */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-heading text-sm font-bold tracking-wider transition-all"
          style={{
            background: sending ? 'rgba(187,92,246,0.1)' : 'rgba(187,92,246,0.2)',
            border: '1px solid rgba(187,92,246,0.35)',
            color: sending ? '#6D28D9' : '#D88BFF',
            cursor: sending ? 'not-allowed' : 'pointer',
          }}>
          <Send size={14} />
          {sending ? 'Sending…' : mode === 'bulk' ? 'Send to all matching users' : 'Send email'}
        </button>

        {result && (
          <div className="font-heading text-xs px-4 py-2 rounded-xl"
            style={{
              background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: result.ok ? '#10B981' : '#EF4444',
            }}>
            {result.ok
              ? `✓ Sent${result.succeeded !== undefined ? ` to ${result.succeeded} recipient${result.succeeded !== 1 ? 's' : ''}` : ''}`
              : `✗ ${result.error || 'Failed'}`}
            {result.failed !== undefined && result.failed > 0 && (
              <span style={{ color: '#F59E0B' }}> · {result.failed} failed</span>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
