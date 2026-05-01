'use client'

import { useState, useEffect } from 'react'
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
        <Hero lang={lang} isLoggedIn={isLoggedIn} userName={userName} />
        <HowItWorks lang={lang} />
        <Features lang={lang} />
        <WhyIon lang={lang} />
        <CTA lang={lang} isLoggedIn={isLoggedIn} />
      </main>
      <Footer lang={lang} />
    </div>
  )
}
