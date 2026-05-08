'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import { createBrowserClient } from '@/lib/supabase'
import { Eye, EyeOff, ArrowRight, Loader2, Mail, RefreshCw } from 'lucide-react'

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ background: '#050505', minHeight: '100vh' }} />}>
      <SignupForm />
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

// ── Google SVG ───────────────────────────────────────────────
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

// ── Apple SVG ────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/onboarding'

  // Email/password state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // OAuth state
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null)

  // ── Email/password signup ───────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const supabase = createBrowserClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${nextUrl}` },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    setLoading(false)
    if (data.session) {
      // Auto-confirm is on — redirect immediately
      setTimeout(() => router.push(nextUrl), 800)
    } else {
      // Email confirmation required
      setEmailSent(true)
    }
  }

  // ── Resend confirmation email ───────────────────────────
  const handleResend = async () => {
    setResending(true)
    setResendSuccess(false)
    const supabase = createBrowserClient()
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${nextUrl}` },
    })
    setResending(false)
    setResendSuccess(true)
    setTimeout(() => setResendSuccess(false), 4000)
  }

  // ── OAuth (Google) ──────────────────────────────────────
  const handleOAuth = async (provider: 'google') => {
    setOauthLoading(provider)
    const supabase = createBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(null)
    }
    // On success the browser will redirect — no further action needed
  }

  // ── Email confirmation sent screen ──────────────────────
  if (emailSent) {
    return (
      <AuthCard title="CHECK YOUR EMAIL" subtitle="One more step.">
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.3)' }}>
            <Mail size={28} style={{ color: '#BB5CF6' }} />
          </div>

          <div className="text-center">
            <p className="font-heading font-semibold text-sm text-white mb-2">
              A confirmation email has been sent.
            </p>
            <p className="font-heading text-sm leading-relaxed" style={{ color: '#64748B' }}>
              Please verify your email at <span style={{ color: '#94A3B8' }}>{email}</span> before continuing. Check your spam folder if you don't see it.
            </p>
          </div>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 font-heading text-xs font-semibold transition-colors"
            style={{ color: resendSuccess ? '#10B981' : '#BB5CF6' }}
          >
            {resending
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />}
            {resendSuccess ? 'Confirmation email resent!' : 'Resend confirmation email'}
          </button>

          <Link
            href={`/auth/login?next=${nextUrl}`}
            className="font-heading text-xs font-bold tracking-widest uppercase transition-colors"
            style={{ color: '#475569', letterSpacing: '0.1em' }}
          >
            Already confirmed? Log In →
          </Link>
        </div>
      </AuthCard>
    )
  }

  // ── Main signup form ────────────────────────────────────
  return (
    <AuthCard
      title="CREATE ACCOUNT"
      subtitle="Free forever. No credit card required."
      footer={
        <p className="font-heading text-sm tracking-wider" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-bold transition-colors" style={{ color: '#BB5CF6' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#CC80FF' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#BB5CF6' }}>
            Log In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-5">
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
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="Min. 8 characters"
              className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-heading outline-none transition-all duration-200"
              style={inputBase} onFocus={inputFocus} onBlur={inputBlur} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#64748B' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>Confirm Password</label>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            required placeholder="Repeat password"
            className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
            style={inputBase} onFocus={inputFocus} onBlur={inputBlur} />
        </div>

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
            <>START WITH ION <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>
          )}
        </button>

        {/* Terms */}
        <p className="font-heading text-xs text-center" style={{ color: '#475569', letterSpacing: '0.04em' }}>
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline" style={{ color: '#64748B' }}>Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline" style={{ color: '#64748B' }}>Privacy Policy</Link>.
        </p>
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
