'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthCard from '@/components/auth/AuthCard'
import { createBrowserClient } from '@/lib/supabase'
import { ArrowRight, Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createBrowserClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (resetError) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <AuthCard
      title="RESET PASSWORD"
      subtitle={sent ? 'Check your inbox.' : 'Ion will send you a reset link.'}
      footer={
        <Link href="/auth/login"
          className="flex items-center justify-center gap-1.5 font-heading text-sm tracking-wider transition-colors"
          style={{ color: '#64748B', letterSpacing: '0.06em' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#BB5CF6' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B' }}
        >
          <ArrowLeft size={13} />Back to Login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(187,92,246,0.1)', border: '1px solid rgba(187,92,246,0.2)' }}>📬</div>
          <div className="text-center">
            <p className="font-heading font-bold text-white text-sm tracking-wider mb-1" style={{ letterSpacing: '0.06em' }}>Reset link sent</p>
            <p className="font-heading text-xs" style={{ color: '#64748B' }}>
              Check <span style={{ color: '#A78BFA' }}>{email}</span> and follow the link to set a new password.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
              style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
          </div>
          {error && <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-heading text-xs" style={{ color: '#F87171' }}>{error}</p></div>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-4 font-heading font-black text-sm group mt-2" style={{ letterSpacing: '0.12em' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>SEND RESET LINK</span><ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
