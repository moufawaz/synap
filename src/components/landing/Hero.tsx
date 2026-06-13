'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import IonDemo from '@/components/landing/IonDemo'
import PhoneMockup from '@/components/landing/PhoneMockup'
import { type Language, t } from '@/lib/i18n'
import { ArrowRight, Apple, Cpu } from 'lucide-react'

interface HeroProps {
  lang: Language
  isLoggedIn?: boolean
  userName?: string
}

export default function Hero({ lang, isLoggedIn = false, userName = '' }: HeroProps) {
  const isRTL = lang === 'ar'
  const firstName = userName ? userName.split(' ')[0] : ''
  const reduce = useReducedMotion()

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.21, 0.6, 0.35, 1] as const },
        }

  return (
    <section className="relative overflow-hidden pt-16" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background orbs */}
      <div className="orb w-[800px] h-[650px] top-[-200px] left-1/2 -translate-x-1/2" style={{ background: 'rgba(187,92,246,0.13)' }} />
      <div className="orb w-[350px] h-[350px] bottom-[0%] left-[-100px]" style={{ background: 'rgba(123,47,255,0.08)' }} />
      <div className="orb w-[300px] h-[300px] top-[30%] right-[-80px]" style={{ background: 'rgba(187,92,246,0.07)' }} />

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(187,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(187,92,246,0.8) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black, transparent)',
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="scan-line" /></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-center min-h-[calc(100vh-4rem)] py-16">

          {/* ── Copy ── */}
          <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-start text-left'} gap-7`}>
            <motion.div {...enter(0)} className="flex flex-wrap items-center gap-2.5">
              <div className="section-label">
                <Cpu size={11} />
                <span>ION AI — {isRTL ? 'متصل' : 'CONNECTED'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              </div>
              {/* Live App Store badge */}
              <a
                href="https://apps.apple.com/sa/app/synap-ai-fitness-coach/id6771498466"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-heading font-bold tracking-widest uppercase transition-transform duration-200 hover:-translate-y-0.5"
                style={{ border: '1px solid var(--spark)', color: 'var(--spark-light)', background: 'rgba(187,92,246,0.12)' }}
              >
                <Apple size={11} />
                {isRTL ? 'حمّل من App Store' : 'GET IT ON THE APP STORE'}
              </a>
            </motion.div>

            <motion.h1
              {...enter(0.07)}
              className="font-heading font-black leading-[0.92]"
              style={{ fontSize: 'clamp(2.8rem, 6.5vw, 5.25rem)', letterSpacing: '0.08em' }}
            >
              <span className="block" style={{ color: 'var(--silver)' }}>{isRTL ? 'جسمك' : 'YOUR BODY'}</span>
              <span className="block mb-2" style={{ color: 'var(--silver)' }}>{isRTL ? 'منظومة' : 'IS A SYSTEM.'}</span>
              <span className="block" style={{ fontSize: '0.62em', opacity: 0.95 }}>
                <span style={{ color: 'var(--silver)' }}>SYNAP </span>
                <span
                  style={{
                    background: 'linear-gradient(90deg, #BB5CF6, #D88BFF, #7B2FFF, #BB5CF6)',
                    backgroundSize: '300% 100%',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    animation: reduce ? undefined : 'heroGradientShift 6s linear infinite',
                  }}
                >
                  {isRTL ? 'هو النظام.' : 'IS THE OS.'}
                </span>
              </span>
            </motion.h1>

            <motion.p
              {...enter(0.12)}
              className="font-heading font-semibold text-silver-muted uppercase"
              style={{ letterSpacing: '0.2em', fontSize: '0.75rem' }}
            >
              PERFORMANCE <span style={{ color: '#BB5CF6' }}>CONNECTED.</span>
            </motion.p>

            <motion.p {...enter(0.16)} className="text-silver-muted text-base sm:text-lg leading-relaxed max-w-md">
              {t(lang, 'hero_sub')}
            </motion.p>

            <motion.div {...enter(0.22)} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn-primary text-sm px-8 py-4 group font-heading font-bold" style={{ letterSpacing: '0.1em' }}>
                  {firstName ? `${isRTL ? 'أهلاً بعودتك، ' : 'WELCOME BACK, '}${firstName.toUpperCase()} →` : isRTL ? 'افتح لوحتك →' : 'OPEN DASHBOARD →'}
                </Link>
              ) : (
                <Link href="/auth/signup" className="btn-primary text-sm px-8 py-4 group font-heading font-bold" style={{ letterSpacing: '0.1em' }}>
                  {t(lang, 'hero_cta').toUpperCase()}
                  <ArrowRight size={16} className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              )}
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center text-xs font-heading font-semibold tracking-widest uppercase px-8 py-4 rounded-xl transition-colors hover:border-spark"
                style={{ border: '1px solid rgba(187,92,246,0.35)', color: '#D88BFF', letterSpacing: '0.15em' }}
              >
                {isRTL ? 'الخطط والأسعار' : 'SEE PLANS'}
              </Link>
            </motion.div>

            <motion.p {...enter(0.26)} className="text-silver-muted/50 text-xs font-heading tracking-widest uppercase">
              {t(lang, 'hero_free_note')}
            </motion.p>

            {/* Product-truth chips */}
            <motion.div {...enter(0.3)} className="flex flex-wrap gap-2">
              {(isRTL
                ? ['تجربة Elite مجانية ٧ أيام', 'عربي + إنجليزي', 'يعرف أكلك المحلي 🍛', 'يقرأ تحليل InBody']
                : ['7-day free Elite trial', 'Arabic + English', 'Knows your local food 🍛', 'Reads your InBody scan']
              ).map(chip => (
                <span
                  key={chip}
                  className="px-3 py-1.5 rounded-full text-[11px] font-heading font-semibold"
                  style={{ background: 'rgba(187,92,246,0.10)', border: '1px solid rgba(187,92,246,0.22)', color: 'var(--spark-light)' }}
                >
                  {chip}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── Product: phone + live Ion chat ── */}
          <motion.div
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.96, y: 24 },
                  animate: { opacity: 1, scale: 1, y: 0 },
                  transition: { duration: 0.9, delay: 0.25, ease: [0.21, 0.6, 0.35, 1] as const },
                })}
            className="relative flex justify-center items-center"
          >
            <div className="relative w-full max-w-[560px] flex justify-center">
              {/* Phone (back layer, floats) */}
              <div className={`hidden md:block animate-float ${isRTL ? 'translate-x-16' : '-translate-x-16'}`}>
                <PhoneMockup lang={lang} />
              </div>
              {/* Live Ion chat (front layer) */}
              <div className={`w-full max-w-sm md:absolute md:bottom-6 ${isRTL ? 'md:left-0' : 'md:right-0'} animate-float-delayed`}>
                <IonDemo lang={lang} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-30">
        <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, #BB5CF6)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#BB5CF6' }} />
      </div>

    </section>
  )
}
