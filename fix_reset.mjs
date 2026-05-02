import { writeFileSync } from 'fs'

writeFileSync('src/app/auth/reset-password/page.tsx', `'use client'

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
  const supabase = useRef(createBrowserClient())

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      setExchanging(false)
      return
    }
    supabase.current.auth.exchangeCodeForSession(code).then(({ error: err }) => {
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
    const { error: updateError } = await supabase.current.auth.updateUser({ password })
    if (updateError) {
      setError('Failed to update password: ' + updateError.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inp = { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }
  const onFocus = (e: any) => { e.target.style.borderColor = 'rgba(187,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(187,92,246,0.1)' }
  const onBlur  = (e: any) => { e.target.style.borderColor = 'rgba(