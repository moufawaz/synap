'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import { createBrowserClient } from '@/lib/supabase'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0A0A0A', minHeight: '100vh' }} />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef(createBrowserClient())
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { setError('Invalid or expired reset link. Please request a new one.'); setExchanging(false); return }
    supabaseRef.current.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) setError('This reset link has expired. Please request a new one.')
      setExchanging(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: updateError } = await supabaseRef.current.auth.updateUser({ password })
    if (updateError) { setError('Failed to update password. Please try again.'); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inp = { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }
  const focus = (e: any) => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }
  const blur  = (e: any) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }

  return (
    <AuthCard title="NEW PASSWORD" subtitle={done ? 'All set. Redirecting you now.' : 'Choose a strong password for your account.'}>
      {exchanging ? (
        <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: '#BB5CF6' }} /></div>
      ) : done ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>✅</div>
          <p className="font-heading text-sm text-center" style={{ color: '#64748B' }}>Password updated. Taking you to your dashboard…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>New Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                required minLength={8} placeholder="At least 8 characters"
                className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-heading outline-none transition-all duration-200"
                style={inp} onFocus={focus} onBlur={blur} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Confirm Password</label>
            <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              required placeholder="Same password again"
              className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
              style={inp} onFocus={focus} onBlur={blur} />
          </div>
          {password.length > 0 && (
            <div className="flex gap-1.5">
              {[...Array(4)].map((_, i) => {
                const s = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1
                return <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i < s ? (s===1?'#EF4444':s===2?'#F59E0B':s===3?'#3B82F6':'#10B981') : 'rgba(255,255,255,0.06)' }} />
              })}
            </div>
          )}
          {error && <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-heading text-xs" style={{ color: '#F87171' }}>{error}</p></div>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-4 font-heading font-black text-sm group mt-2" style={{ letterSpacing: '0.12em' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>SET NEW PASSWORD</span><ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
