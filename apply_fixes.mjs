/**
 * Synap bug fixes — run from the root of your Synap project:
 *   node apply_fixes.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = dirname(fileURLToPath(import.meta.url))

function read(p) { return readFileSync(join(ROOT, p), 'utf8') }

function write(p, content) {
  const full = join(ROOT, p)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content.replace(/\r\n/g, '\n'), 'utf8')
  console.log('  OK  ' + p)
}

function patch(p, oldStr, newStr) {
  const content = read(p)
  if (!content.includes(oldStr)) { console.log('  SKIP: ' + p); return }
  write(p, content.replace(oldStr, newStr))
}

console.log('\n-- Applying Synap fixes --\n')

// Fix 1: workout/today/page.tsx — dynamicConfig typo
patch('src/app/(app)/workout/today/page.tsx',
  "export const dynamicConfig = 'force-dynamic'",
  "export const dynamic = 'force-dynamic'")

// Fix 2: auth/callback — always redirected to /onboarding
patch('src/app/auth/callback/route.ts',
  `    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/onboarding', request.url))`,
  `    await supabase.auth.exchangeCodeForSession(code)

    // Check if this user already has a profile (returning user vs new signup)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/onboarding', request.url))`)

// Fix 3a: adaptation-check — remove module-level Anthropic client
patch('src/app/api/adaptation-check/route.ts',
  'const client = new Anthropic()\n\n// POST /api/adaptation-check',
  '// POST /api/adaptation-check')
patch('src/app/api/adaptation-check/route.ts',
  `export async function POST(req: Request) {\n  try {\n    const supabase = createServerClient()`,
  `export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = createServerClient()`)

// Fix 3b: adaptation-check — streak miscalculation
patch('src/app/api/adaptation-check/route.ts',
  `    let streak = 0
    const today = new Date().toDateString()
    for (const log of workoutLogs) {
      const d = new Date(log.logged_at).toDateString()
      if (d === today || streak > 0) streak++
      else break
    }`,
  `    const uniqueDays = [...new Set(workoutLogs.map((l) =>
      new Date(l.logged_at).toDateString()
    ))]
    let streak = 0
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      if (uniqueDays[i] === expected.toDateString()) {
        streak++
      } else {
        break
      }
    }`)

// Fix 4: monthly-summary — remove module-level Anthropic client
patch('src/app/api/monthly-summary/route.ts',
  `const client = new Anthropic()\n\nexport async function GET() {\n  try {\n    const supabase = createServerClient()`,
  `export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = createServerClient()`)

// Fix 5: renew-plan — remove module-level Anthropic client
patch('src/app/api/renew-plan/route.ts',
  'const client = new Anthropic()\n\n// POST /api/renew-plan',
  '// POST /api/renew-plan')
patch('src/app/api/renew-plan/route.ts',
  `export async function POST(req: Request) {\n  try {\n    const supabase = createServerClient()\n    const { data: { user } } = await supabase.auth.getUser()\n    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n\n    const { planType }`,
  `export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    const client = new Anthropic()
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planType }`)

// Fix 6: PlanGenerating — language never saved
patch('src/components/onboarding/PlanGenerating.tsx',
  '        body: JSON.stringify({ data }),',
  '        body: JSON.stringify({ data: { ...data, language: lang } }),')

// New file 1: forgot-password page
write('src/app/auth/forgot-password/page.tsx', `'use client'

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
      redirectTo: \`\${window.location.origin}/auth/reset-password\`,
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
`)

// New file 2: reset-password page
write('src/app/auth/reset-password/page.tsx', `'use client'

import { useState, useEffect, Suspense } from 'react'
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
    const supabase = createBrowserClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
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
    const supabase = createBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
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
`)

console.log('\n-- All done! Now run:')
console.log('  git add -A')
console.log('  git commit -m "fix: auth redirect, streak, AI guards, language save, forgot/reset password"')
console.log('  git push')
console.log('\nAlso add to Supabase > Auth > Redirect URLs:')
console.log('  https://<your-domain>.vercel.app/auth/reset-password\n')