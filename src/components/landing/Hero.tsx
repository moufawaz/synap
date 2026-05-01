'use client'

import { useState } from 'react'
import Link from 'next/link'
import IonAvatar from '@/components/ui/IonAvatar'
import SynapLogo from '@/components/ui/SynapLogo'
import { type Language, t } from '@/lib/i18n'
import { ArrowRight, Cpu } from 'lucide-react'

interface HeroProps {
  lang: Language
  isLoggedIn?: boolean
  userName?: string
}

export default function Hero({ lang, isLoggedIn = false, userName = '' }: HeroProps) {
  const [ionGender, setIonGender] = useState<'male' | 'female'>('male')
  const isRTL = lang === 'ar'
  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background orbs — ion purple */}
      <div className="orb w-[700px] h-[600px] top-[-150px] left-1/2 -translate-x-1/2" style={{ background: 'rgba(187,92,246,0.12)' }} />
      <div className="orb w-[350px] h-[350px] bottom-[5%] left-[-80px]" style={{ background: 'rgba(187,92,246,0.07)' }} />
      <div className="orb w-[280px] h-[280px] top-[20%] right-[-60px]" style={{ background: 'rgba(187,92,246,0.06)' }} />

      {/* Technical grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(187,92,246,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(187,92,246,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-line" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-4rem)] py-16">

          {/* ── Left — Copy ── */}
          <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-start text-left'} gap-7`}>

            {/* System status badge */}
            <div className="section-label animate-fade-in">
              <Cpu size={11} />
              <span>ION AI — {isRTL ? 'متصل' : 'CONNECTED'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
            </div>

            {/* Main headline — SYNAP brand voice */}
            <div className="animate-slide-up">
              <h1
                className="font-heading font-black leading-[0.95] tracking-widest"
                style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
              >
                <span
                  className="block text-white mb-1"
                  style={{ letterSpacing: '0.08em' }}
                >
                  {isRTL ? 'جسمك' : 'YOUR BODY'}
                </span>
                <span
                  className="block text-white/20 mb-1"
                  style={{ letterSpacing: '0.08em', fontSize: '0.55em' }}
                >
                  {isRTL ? 'منظومة.' : 'IS A SYSTEM.'}
                </span>
                <span
                  className="block"
                  style={{ letterSpacing: '0.08em' }}
                >
                  <span className="text-white">SYNAP </span>
                  <span style={{ color: '#BB5CF6' }}>
                    {isRTL ? 'هو النظام.' : 'IS THE OS.'}
                  </span>
                </span>
              </h1>
            </div>

            {/* Tagline line */}
            <p
              className="font-heading font-semibold text-silver-muted tracking-widest uppercase animate-slide-up"
              style={{ animationDelay: '0.05s', letterSpacing: '0.2em', fontSize: '0.75rem' }}
            >
              PERFORMANCE{' '}
              <span style={{ color: '#BB5CF6' }}>CONNECTED.</span>
            </p>

            {/* Sub copy */}
            <p
              className="text-silver-muted text-base sm:text-lg leading-relaxed max-w-md animate-slide-up"
              style={{ animationDelay: '0.12s' }}
            >
              {t(lang, 'hero_sub')}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn-primary text-sm px-8 py-4 group font-heading font-bold" style={{ letterSpacing: '0.1em' }}>
                  {firstName ? `WELCOME BACK, ${firstName.toUpperCase()} →` : 'OPEN DASHBOARD →'}
                </Link>
              ) : (
                <Link href="/auth/signup" className="btn-primary text-sm px-8 py-4 group font-heading font-bold" style={{ letterSpacing: '0.1em' }}>
                  {t(lang, 'hero_cta').toUpperCase()}
                  <ArrowRight size={16} className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              )}
            </div>

            {/* Free note */}
            {!isLoggedIn && (
              <p className="text-silver-muted/50 text-xs font-heading tracking-widest uppercase animate-fade-in" style={{ animationDelay: '0.3s' }}>
                {t(lang, 'hero_free_note')}
              </p>
            )}

            {/* Social proof */}
            <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex -space-x-2">
                {['#BB5CF6', '#9B3CD6', '#7B2FFF', '#CC80FF'].map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: `${color}50`, borderColor: '#121212' }}
                  >
                    {['A', 'M', 'S', 'K'][i]}
                  </div>
                ))}
              </div>
              <p className="text-silver-muted/60 text-xs font-heading tracking-wider">
                {isRTL ? 'JOINED BY THOUSANDS' : 'JOINED BY THOUSANDS'}
              </p>
            </div>
          </div>

          {/* ── Right — Ion Chat Preview ── */}
          <div className="flex justify-center lg:justify-end animate-float">
            <div className="relative w-full max-w-sm">

              {/* Glow behind card */}
              <div
                className="absolute inset-0 blur-3xl scale-110 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(187,92,246,0.25) 0%, transparent 70%)' }}
              />

              {/* Main card */}
              <div className="relative glass-card overflow-hidden gradient-border" style={{ background: '#0E0E0E' }}>

                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <IonAvatar gender={ionGender} size="sm" animated />
                    <div>
                      <p className="text-white text-sm font-heading font-bold tracking-wider">ION</p>
                      <p className="text-xs" style={{ color: '#BB5CF6' }}>{t(lang, 'ion_trainer')}</p>
                    </div>
                  </div>

                  {/* Gender toggle */}
                  <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#0A0A0A' }}>
                    <button
                      onClick={() => setIonGender('male')}
                      className="px-3 py-1 rounded-md text-xs font-heading font-semibold transition-all duration-200 tracking-wider"
                      style={ionGender === 'male'
                        ? { background: '#BB5CF6', color: 'white', boxShadow: '0 0 12px rgba(187,92,246,0.4)' }
                        : { color: '#94A3B8' }
                      }
                    >
                      {t(lang, 'ion_male').toUpperCase()}
                    </button>
                    <button
                      onClick={() => setIonGender('female')}
                      className="px-3 py-1 rounded-md text-xs font-heading font-semibold transition-all duration-200 tracking-wider"
                      style={ionGender === 'female'
                        ? { background: '#BB5CF6', color: 'white', boxShadow: '0 0 12px rgba(187,92,246,0.4)' }
                        : { color: '#94A3B8' }
                      }
                    >
                      {t(lang, 'ion_female').toUpperCase()}
                    </button>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="px-5 py-4 flex flex-col gap-3 min-h-[280px]" dir={isRTL ? 'rtl' : 'ltr'}>

                  {/* Ion message 1 */}
                  <div className="flex items-start gap-2.5 chat-bubble">
                    <IonAvatar gender={ionGender} size="sm" />
                    <div className="max-w-[78%]">
                      <div className="rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-silver text-sm leading-relaxed">{t(lang, 'chat_bubble_1')}</p>
                      </div>
                    </div>
                  </div>

                  {/* User message */}
                  <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} chat-bubble`} style={{ animationDelay: '0.5s' }}>
                    <div className="max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-2.5" style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.25)' }}>
                      <p className="text-silver text-sm leading-relaxed">{t(lang, 'chat_bubble_2')}</p>
                    </div>
                  </div>

                  {/* Ion message 2 */}
                  <div className="flex items-start gap-2.5 chat-bubble" style={{ animationDelay: '1s' }}>
                    <IonAvatar gender={ionGender} size="sm" />
                    <div className="max-w-[78%]">
                      <div className="rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-silver text-sm leading-relaxed">{t(lang, 'chat_bubble_3')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Typing */}
                  <div className="flex items-start gap-2.5">
                    <IonAvatar gender={ionGender} size="sm" />
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex gap-1 items-center">
                        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick reply chips */}
                <div className="px-5 pb-4 flex flex-wrap gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                  {[
                    isRTL ? 'فقدان الدهون 🔥' : 'Fat Loss 🔥',
                    isRTL ? 'بناء العضلات 💪' : 'Muscle Gain 💪',
                    isRTL ? 'إعادة التشكيل ⚡' : 'Recomposition ⚡',
                  ].map((chip) => (
                    <button
                      key={chip}
                      className="px-3 py-1.5 rounded-full text-xs font-heading font-semibold tracking-wider transition-all duration-200"
                      style={{ border: '1px solid rgba(187,92,246,0.3)', background: 'rgba(187,92,246,0.08)', color: '#E2E8F0' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(187,92,246,0.18)' }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(187,92,246,0.08)' }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input bar */}
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ background: '#0A0A0A', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <input
                      type="text"
                      placeholder={isRTL ? 'اكتب ردّك...' : 'Type your reply...'}
                      className="flex-1 bg-transparent text-sm outline-none font-heading"
                      style={{ color: '#E2E8F0' }}
                      readOnly
                    />
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#BB5CF6' }}>
                      <ArrowRight size={13} className={`text-white ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating status badges */}
              <div className="absolute -top-4 -right-4 glass-card px-3 py-2 flex items-center gap-2 animate-float-delayed" style={{ boxShadow: '0 0 20px rgba(187,92,246,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#108981' }} />
                <span className="text-xs font-heading font-semibold whitespace-nowrap tracking-wider" style={{ color: '#108981' }}>
                  {isRTL ? 'يتعلم منك' : 'LEARNING'}
                </span>
              </div>

              <div className="absolute -bottom-4 -left-4 glass-card px-3 py-2 flex items-center gap-2 animate-float">
                <span className="text-base">⚡</span>
                <div>
                  <p className="text-white text-xs font-heading font-bold tracking-wider">{isRTL ? 'خطتك الآن' : 'YOUR PLAN'}</p>
                  <p className="text-xs font-heading tracking-wider" style={{ color: '#BB5CF6', fontSize: '0.6rem' }}>
                    {isRTL ? 'مخصّصة 100%' : '100% CUSTOM'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-30">
        <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, transparent, #BB5CF6)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#BB5CF6' }} />
      </div>
    </section>
  )
}
