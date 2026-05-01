'use client'

import { useState } from 'react'
import { type Language } from '@/lib/i18n'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import Features from '@/components/landing/Features'
import WhyIon from '@/components/landing/WhyIon'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  const [lang, setLang] = useState<Language>('en')

  return (
    <div
      className="relative min-h-screen bg-charcoal overflow-x-hidden"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <Navbar lang={lang} onLangChange={setLang} />

      {/* Main content */}
      <main>
        <Hero lang={lang} />
        <HowItWorks lang={lang} />
        <Features lang={lang} />
        <WhyIon lang={lang} />
        <CTA lang={lang} />
      </main>

      {/* Footer */}
      <Footer lang={lang} />
    </div>
  )
}
