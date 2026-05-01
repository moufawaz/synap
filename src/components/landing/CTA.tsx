'use client'

import Link from 'next/link'
import { type Language, t } from '@/lib/i18n'
import { ArrowRight, Zap } from 'lucide-react'

interface CTAProps {
  lang: Language
  isLoggedIn?: boolean
}

export default function CTA({ lang, isLoggedIn = false }: CTAProps) {
  const isRTL = lang === 'ar'

  return (
    <section
      className="relative py-24 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      <div className="orb w-[700px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-violet/12" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="glass-card p-12 sm:p-16 relative overflow-hidden">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet/10 via-transparent to-cyan/5 pointer-events-none" />

          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-violet to-transparent" />

          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-violet/20 border border-violet/40 flex items-center justify-center shadow-glow-violet">
              <Zap size={28} className="text-violet" />
            </div>

            {/* Copy */}
            <div className="flex flex-col gap-3">
              <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-light">
                {t(lang, 'cta_title')}
              </h2>
              <p className="text-light-muted text-lg max-w-xl mx-auto">
                {t(lang, 'cta_sub')}
              </p>
            </div>

            {/* CTA button */}
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary text-lg px-10 py-5 group mt-2">
                OPEN MY DASHBOARD →
              </Link>
            ) : (
              <Link href="/auth/signup" className="btn-primary text-lg px-10 py-5 group mt-2">
                {t(lang, 'cta_btn')}
                <ArrowRight
                  size={20}
                  className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0' : ''}`}
                />
              </Link>
            )}

            {/* Note */}
            {!isLoggedIn && (
              <p className="text-light-muted/60 text-sm">
                {t(lang, 'cta_note')}
              </p>
            )}

            {/* Stats */}
            <div className={`flex flex-wrap justify-center gap-8 mt-4 pt-6 border-t border-white/5 w-full`}>
              {[
                { value: '8 min', label: isRTL ? 'لإعداد خطتك' : 'to set up your plan' },
                { value: '100%', label: isRTL ? 'مجاني' : 'free to start' },
                { value: '0', label: isRTL ? 'بطاقات ائتمان' : 'credit cards needed' },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span className="font-heading font-bold text-2xl gradient-text-violet">{stat.value}</span>
                  <span className="text-light-muted text-xs">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
