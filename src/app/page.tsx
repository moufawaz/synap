'use client'

import { useState, useEffect } from 'react'
import { type Language } from '@/lib/i18n'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
// ── NEW sections (added below hero per spec step 1) ──────────────
import TheProblem from '@/components/landing/TheProblem'
import AIComparison from '@/components/landing/AIComparison'
import HowIonWorks from '@/components/landing/HowIonWorks'
import FeaturesGrid from '@/components/landing/FeaturesGrid'
import SocialProof from '@/components/landing/SocialProof'
// ── Existing sections (kept intact) ──────────────────────────────
import HowItWorks from '@/components/landing/HowItWorks'
import Features from '@/components/landing/Features'
import WhyIon from '@/components/landing/WhyIon'
import LandingPricing from '@/components/landing/LandingPricing'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  const [lang, setLang] = useState<Language>('en')
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
            .single()
          if (data?.name) setUserName(data.name)
        }
      } catch {}
    }
    checkAuth()
  }, [])

  return (
    <div
      className="relative min-h-screen bg-charcoal overflow-x-hidden"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="noise-overlay" />
      <Navbar lang={lang} onLangChange={setLang} isLoggedIn={isLoggedIn} userName={userName} />
      <main>
        {/* ── Hero — headline untouched ────────────────────────── */}
        <Hero lang={lang} isLoggedIn={isLoggedIn} userName={userName} />

        {/* ── New sections added AFTER hero (spec step 1) ─────── */}
        <TheProblem lang={lang} />       {/* 1A — The Problem */}
        <AIComparison lang={lang} />     {/* 1B — Why General AI Can't Train You */}
        <HowIonWorks lang={lang} />      {/* 1C — How Ion Works */}
        <FeaturesGrid lang={lang} />     {/* 1D — Features Grid */}
        <SocialProof lang={lang} />      {/* 1E — Social Proof */}

        {/* ── Existing sections kept intact ───────────────────── */}
        <HowItWorks lang={lang} />
        <Features lang={lang} />
        <WhyIon lang={lang} />
        <LandingPricing lang={lang} />

        {/* ── Updated CTA (spec 1F) ────────────────────────────── */}
        <CTA lang={lang} isLoggedIn={isLoggedIn} />
      </main>
      <Footer lang={lang} />
    </div>
  )
}
