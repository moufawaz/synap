'use client'

import Link from 'next/link'
import { type Language } from '@/lib/i18n'
import PhoneMockup from '@/components/landing/PhoneMockup'
import Reveal from '@/components/landing/Reveal'
import { ArrowRight, Apple } from 'lucide-react'

interface CTAProps {
  lang: Language
  isLoggedIn?: boolean
}

export default function CTA({ lang, isLoggedIn = false }: CTAProps) {
  const isRTL = lang === 'ar'

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[700px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-violet/12" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal>
          <div className="glass-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet/10 via-transparent to-cyan/5 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-violet to-transparent" />

            <div className={`relative z-10 grid lg:grid-cols-2 gap-10 items-center p-10 sm:p-14`}>
              {/* Copy */}
              <div className={`flex flex-col gap-6 ${isRTL ? 'items-end text-right' : 'items-start text-left'}`}>
                <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light" style={{ letterSpacing: '0.03em' }}>
                  {isRTL ? 'آيون مستعد لمقابلتك.' : 'Ion is ready to meet you.'}
                </h2>
                <p className="text-light-muted text-lg max-w-xl">
                  {isRTL
                    ? 'أخبر آيون كل شيء — وشاهد ما سيُبنى لك. خطة كاملة خلال 8 دقائق.'
                    : 'Tell Ion everything — and watch what gets built. A full plan in 8 minutes.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="btn-primary text-lg px-10 py-5 group">
                      {isRTL ? 'افتح لوحتي ←' : 'OPEN MY DASHBOARD →'}
                    </Link>
                  ) : (
                    <Link href="/auth/signup" className="btn-primary text-lg px-10 py-5 group">
                      {isRTL ? 'ابدأ مجاناً — قابل آيون الآن' : 'Start Free — Meet Ion Now'}
                      <ArrowRight
                        size={20}
                        className={`transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
                      />
                    </Link>
                  )}
                </div>

                {!isLoggedIn && (
                  <p className="text-light-muted/60 text-sm">
                    {isRTL
                      ? '7 أيام مجاناً · لا بطاقة ائتمان · لا رسوم إذا ألغيت'
                      : '7 days free · No credit card · Zero charges if you cancel'}
                  </p>
                )}

                {/* App Store slot — swap for the real badge + link at launch */}
                <div
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl"
                  style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <Apple size={22} className="text-white" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-[10px] uppercase tracking-widest text-light-muted/70 font-heading">
                      {isRTL ? 'قريباً على' : 'COMING SOON ON THE'}
                    </p>
                    <p className="text-white font-heading font-bold text-sm leading-tight">App Store</p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="hidden lg:flex justify-center animate-float">
                <PhoneMockup lang={lang} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
