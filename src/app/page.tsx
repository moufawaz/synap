'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { useLanguage } from '@/lib/useLanguage'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import TheProblem from '@/components/landing/TheProblem'
import AIComparison from '@/components/landing/AIComparison'
import HowIonWorks from '@/components/landing/HowIonWorks'
import FeaturesGrid from '@/components/landing/FeaturesGrid'
import SocialProof from '@/components/landing/SocialProof'
import LandingPricing from '@/components/landing/LandingPricing'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  const { lang, setLang } = useLanguage()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [isNative, setIsNative] = useState(false)

  // useLayoutEffect fires BEFORE the browser paints — so if we're in the
  // native app the landing page is never visible for even a single frame.
  useLayoutEffect(() => {
    if (!(window as any).Capacitor?.isNativePlatform?.()) return
    setIsNative(true)
    import('@/lib/supabase').then(async ({ createBrowserClient }) => {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide()
      }).catch(() => {})
      window.location.replace(user ? '/dashboard' : '/auth/login')
    }).catch(() => {
      window.location.replace('/auth/login')
    })
  }, [])

  useEffect(() => {
    // Not native — run web-only checks.
    if ((window as any).Capacitor?.isNativePlatform?.()) return

    // Supabase password recovery sends users to the site URL (homepage) with
    // the recovery token in the URL hash when the redirectTo URL isn't in the
    // allowlist. Detect this and forward to the reset-password page immediately.
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      window.location.replace('/auth/reset-password' + hash)
      return
    }

    async function checkAuth() {
      try {
        const { createBrowserClient } = await import('@/lib/supabase')
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setIsLoggedIn(true)
          const { data } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.name) setUserName(data.name)
        }
      } catch {}
    }
    checkAuth()
  }, [])

  // Show black screen instantly in native app while auth check + redirect runs
  if (isNative) {
    return <div style={{ background: '#0A0A0F', minHeight: '100vh' }} />
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: '#0A0A0A' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="noise-overlay" />
      <Navbar lang={lang} onLangChange={setLang} isLoggedIn={isLoggedIn} userName={userName} />
      <main>
        {/* ── Hero — headline untouched ────────────────────────── */}
        <Hero lang={lang} isLoggedIn={isLoggedIn} userName={userName} />

        <TheProblem lang={lang} />
        <AIComparison lang={lang} />
        <HowIonWorks lang={lang} />
        <FeaturesGrid lang={lang} />
        <SocialProof lang={lang} />
        <LandingPricing lang={lang} />

        {/* ── Updated CTA (spec 1F) ────────────────────────────── */}
        <CTA lang={lang} isLoggedIn={isLoggedIn} />
      </main>
      <Footer lang={lang} />
    </div>
  )
}
