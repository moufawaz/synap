'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import { createBrowserClient } from '@/lib/supabase'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createBrowserClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    // Redirect to onboarding after brief success state
    setTimeout(() => router.push('/onboarding'), 1500)
  }

  if (success) {
    return (
      <AuthCard title="YOU'RE IN." subtitle="Setting up Ion for you now.">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,137,129,0.2)', border: '1px solid rgba(16,137,129,0.4)' }}>
            <span className="text-3xl">⚡</span>
          </div>
          <p className="font-heading text-sm tracking-wider text-center" style={{ color: '#94A3B8' }}>
            Redirecting to Ion onboarding...
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="CREATE ACCOUNT"
      subtitle="Free forever. No credit card required."
      footer={
        <p className="font-heading text-sm tracking-wider" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-bold transition-colors" style={{ color: '#BB5CF6' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#CC80FF' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#BB5CF6' }}
          >
            Log In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#E2E8F0',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-heading outline-none transition-all duration-200"
              style={{
                background: '#0A0A0A',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#64748B' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <label className="font-heading text-xs font-semibold tracking-widest uppercase" style={{ color: '#64748B' }}>
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Repeat password"
            className="w-full rounded-xl px-4 py-3 text-sm font-heading outline-none transition-all duration-200"
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#E2E8F0',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-heading text-xs tracking-wider" style={{ color: '#F87171' }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 font-heading font-black text-sm group mt-2"
          style={{ letterSpacing: '0.12em' }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              START WITH ION
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* Terms note */}
        <p className="font-heading text-xs text-center" style={{ color: '#475569', letterSpacing: '0.04em' }}>
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline" style={{ color: '#64748B' }}>Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline" style={{ color: '#64748B' }}>Privacy Policy</Link>.
        </p>
      </form>
    </AuthCard>
  )
}
