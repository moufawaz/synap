'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
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
