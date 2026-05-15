'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import { createBrowserClient } from '@/lib/supabase'
import { SESSION_ACTIVE_KEY, SESSION_MODE_KEY } from '@/lib/auth-session'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#050505', minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  )
}

// ── Shared input style helpers ──────────────────────────────
const inputBase: React.CSSProperties = {
  background: '#0A0A0A',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E2E8F0',
}
const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'rgba(187,92,246,0.5)'
  e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)'
}
const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.boxShadow = 'none'
}

// ── Divider ─────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <span className="font-heading text-xs tracking-widest" style={{ color: '#2D3748' }}>OR</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

// ── OAuth button ─────────────────────────────────────────────
function OAuthButton({ onClick, loading, icon, label }: {
  onClick: () => void
  loading: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-heading font-semibold text-sm transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#CBD5E1',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || searchParams.get('next') || '/dashboard'

  const errorParam = searchParams.get('error')
  const errorMessages: Record<string, string> = {
    link_expired: 'This link has expired or already been used. Request a new one below.',
  }

  // Email/password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorParam ? (errorMessages[errorParam] ?? null) : null)

  // OAuth
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null)

  // ── Email/password login ────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError('Invalid email or password.'); setLoading(false); return }

    // If "Remember me" is off, keep the Supabase session only for this tab session.
    if (!rememberMe) {
      localStorage.setItem(SESSION_MODE_KEY, 'session')
      sessionStorage.setItem(SESSION_ACTIVE_KEY, '1')
      localStorage.removeItem('synap_remember_me')
    } else {
      localStorage.removeItem(SESSION_MODE_KEY)
      sessionStorage.removeItem(SESSION_ACTIVE_KEY)
      localStorage.setItem('synap_remember_me', '1')
    }

    router.push(redirectTo)
    router.refresh()
  }

  // ── OAuth ───────────────────────────────────────────────
  const handleOAuth = async (provider: 'google') => {
    setOauthLoading(provider)
    const supabase = createBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}` },
    })
    if (oauthError) { setError(oauthError.message); setOauthLoading(null) }
  }

  // ── Main login form ─────────────────────────────────────
  return (
    <AuthCard
      title="WELCOME BACK"
      subtitle="Ion has been tracking your progress."
      footer={
        <p className="font-heading text-sm tracking-wider" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
          No account yet?{' '}
          <Link href="/auth/signup" className="font-bold transition-colors" style={{ color: '#BB5CF6' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#CC80FF' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#BB5CF6' }}>
            Start Free
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com"
            className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
            style={inputBase} onFocus={inputFocus} onBlur={inputBlur} />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Password</label>
            <Link href="/auth/forgot-password" className="font-heading text-xs transition-colors" style={{ color: '#475569', letterSpacing: '0.06em' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#BB5CF6' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#475569' }}>
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="Your password"
              className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-heading outline-none transition-all duration-200"
              style={inputBase} onFocus={inputFocus} onBlur={inputBlur} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setRememberMe(!rememberMe)}
            className="relative w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
            style={{
              background: rememberMe ? '#BB5CF6' : 'transparent',
              border: `1.5px solid ${rememberMe ? '#BB5CF6' : 'rgba(255,255,255,0.2)'}`,
              boxShadow: rememberMe ? '0 0 8px rgba(187,92,246,0.3)' : 'none',
            }}
          >
            {rememberMe && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span
            className="font-heading text-xs tracking-wider cursor-pointer"
            style={{ color: '#64748B' }}
            onClick={() => setRememberMe(!rememberMe)}
          >
            Remember me
          </span>
        </label>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-heading text-xs tracking-wider" style={{ color: '#F87171' }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-4 font-heading font-black text-sm group mt-2"
          style={{ letterSpacing: '0.12em' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <>LOG IN <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>
          )}
        </button>
      </form>

      {/* Social auth */}
      <div className="flex flex-col gap-3 mt-2">
        <OrDivider />

        <OAuthButton
          onClick={() => handleOAuth('google')}
          loading={oauthLoading === 'google'}
          icon={<GoogleIcon />}
          label="Continue with Google"
        />
      </div>
    </AuthCard>
  )
}
