'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Shield } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { type Language } from '@/lib/i18n'

interface Props { lang: Language }

// ── EN / AR copy ──────────────────────────────────────────────────────────────
const EN = {
  label:    'PRICING',
  headline: 'Simple, Transparent Pricing',
  sub:      '7-day free trial — no card charged until day 7',
  annual:   'Annual',
  monthly:  'Monthly',
  save:     'SAVE 33%',
  plans: [
    {
      key:        'starter',
      name:       'STARTER',
      badge:      null as string | null,
      priceSAR:   null as number | null,
      annualSAR:  null as number | null,
      priceLabel: 'Free forever',
      features:   ['5 Ion messages / day', 'Adaptive diet plan', 'Smart workout program', 'Body tracking (13 measurements)', 'Bilingual Arabic + English'],
      missing:    ['Unlimited messages', 'Barcode scanner', 'Proactive check-ins'],
      cta:        'Start Free',
      href:       '/auth/signup',
      hero:       false,
    },
    {
      key:       'pro',
      name:      'PRO',
      badge:     'MOST POPULAR',
      priceSAR:  39.99,
      annualSAR: 319.99,
      priceLabel: '',
      features:  ['Unlimited Ion messages / day', 'Everything in Starter', '7-day free trial', 'Barcode food scanner', 'Proactive check-ins', 'Plan renewal that learns', 'Progress photo storage'],
      missing:   ['Goal timeline prediction', 'Weekly body report', 'Supplement recommendations'],
      cta:       'Try Free for 7 Days',
      href:      '/pricing',
      hero:      true,
    },
    {
      key:       'elite',
      name:      'ELITE ⭐',
      badge:     '⭐ BEST VALUE',
      priceSAR:  69.99,
      annualSAR: 559.99,
      priceLabel: '',
      features:  ['Everything in Pro', '7-day free trial', 'Goal timeline prediction', 'Weekly body composition report', 'Supplement recommendations', 'Wearable integration (coming soon)', 'Community feed (coming soon)', 'First access to new features'],
      missing:   [] as string[],
      cta:       'Try Free for 7 Days',
      href:      '/pricing',
      hero:      false,
    },
  ],
  compareAll: 'Compare all plans & features',
  trustLine:  'Zero-charge cancel guarantee before day 7',
  monthlyEq:  (v: string) => `${v}/mo equivalent`,
  saveLine:   (v: string) => `Save ${v} · 3 months free`,
}

const AR = {
  label:    'الأسعار',
  headline: 'أسعار بسيطة وشفافة',
  sub:      'تجربة مجانية 7 أيام — لا يُحصل أي مبلغ قبل اليوم السابع',
  annual:   'سنوي',
  monthly:  'شهري',
  save:     'وفّر 33%',
  plans: [
    {
      key:        'starter',
      name:       'مجاني',
      badge:      null as string | null,
      priceSAR:   null as number | null,
      annualSAR:  null as number | null,
      priceLabel: 'مجاني للأبد',
      features:   ['5 رسائل يومياً مع Ion', 'خطة غذائية تكيفية', 'برنامج تمرين ذكي', 'تتبع الجسم (13 قياساً)', 'ثنائي اللغة عربي + إنجليزي'],
      missing:    ['رسائل غير محدودة', 'ماسح الباركود', 'متابعة استباقية'],
      cta:        'ابدأ مجاناً',
      href:       '/auth/signup',
      hero:       false,
    },
    {
      key:       'pro',
      name:      'برو',
      badge:     'الأكثر شعبية',
      priceSAR:  39.99,
      annualSAR: 319.99,
      priceLabel: '',
      features:  ['رسائل Ion غير محدودة يومياً', 'كل مزايا المجاني', 'تجربة مجانية 7 أيام', 'ماسح باركود الطعام', 'متابعة استباقية', 'تجديد الخطة الذكي', 'تخزين صور التقدم'],
      missing:   ['التنبؤ بالجدول الزمني للهدف', 'تقرير الجسم الأسبوعي', 'توصيات المكملات'],
      cta:       'جرب مجاناً 7 أيام',
      href:      '/pricing',
      hero:      true,
    },
    {
      key:       'elite',
      name:      'إيليت ⭐',
      badge:     '⭐ أفضل قيمة',
      priceSAR:  69.99,
      annualSAR: 559.99,
      priceLabel: '',
      features:  ['كل مزايا برو', 'تجربة مجانية 7 أيام', 'التنبؤ بالجدول الزمني للهدف', 'تقرير تركيبة الجسم الأسبوعي', 'توصيات المكملات الغذائية', 'تكامل الأجهزة (قريباً)', 'مجتمع المستخدمين (قريباً)', 'أولوية الوصول للميزات الجديدة'],
      missing:   [] as string[],
      cta:       'جرب مجاناً 7 أيام',
      href:      '/pricing',
      hero:      false,
    },
  ],
  compareAll: 'قارن جميع الخطط والمزايا',
  trustLine:  'ضمان الإلغاء بدون رسوم قبل اليوم 7',
  monthlyEq:  (v: string) => `${v} / شهرياً`,
  saveLine:   (v: string) => `وفّر ${v} · 3 أشهر مجاناً`,
}

export default function LandingPricing({ lang }: Props) {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const { fmt, loading } = useCurrency()
  const isRTL = lang === 'ar'
  const copy = isRTL ? AR : EN

  return (
    <section id="pricing" className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[700px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'rgba(187,92,246,0.06)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="font-heading text-xs tracking-widest uppercase text-violet/80 mb-4 block">
            {copy.label}
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light mb-3">
            {copy.headline}
          </h2>
          <p className="font-heading text-sm text-light-muted">{copy.sub}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['annual', 'monthly'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className="px-6 py-2.5 rounded-xl font-heading text-sm font-bold tracking-wider transition-all"
                style={{
                  background: billing === b ? '#BB5CF6' : 'transparent',
                  color: billing === b ? 'white' : '#475569',
                  boxShadow: billing === b ? '0 0 20px rgba(187,92,246,0.3)' : 'none',
                }}
              >
                {b === 'annual' ? copy.annual : copy.monthly}
                {b === 'annual' && (
                  <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: billing === 'annual' ? 'rgba(255,255,255,0.2)' : 'rgba(187,92,246,0.15)', color: billing === 'annual' ? 'white' : '#BB5CF6' }}>
                    {copy.save}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {copy.plans.map((plan) => {
            const price = billing === 'annual' ? plan.annualSAR : plan.priceSAR
            const monthlyEq = billing === 'annual' && plan.annualSAR ? plan.annualSAR / 12 : null
            const compareAt = plan.priceSAR ? plan.priceSAR * 12 : null
            const saveSAR   = compareAt && plan.annualSAR ? Math.round(compareAt - plan.annualSAR) : null

            const isElite = plan.key === 'elite'
            const cardStyle = plan.hero
              ? {
                  background: 'linear-gradient(135deg, rgba(187,92,246,0.12), rgba(187,92,246,0.06))',
                  border: '1px solid rgba(187,92,246,0.4)',
                  boxShadow: '0 0 40px rgba(187,92,246,0.15)',
                }
              : isElite
              ? {
                  background: 'linear-gradient(135deg, rgba(187,92,246,0.16), rgba(139,92,246,0.08))',
                  border: '1.5px solid rgba(187,92,246,0.5)',
                  boxShadow: '0 0 50px rgba(187,92,246,0.18)',
                }
              : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }

            return (
              <div key={plan.key} className="relative rounded-2xl p-6 flex flex-col" style={cardStyle}>
                {/* Top accent line */}
                {(plan.hero || isElite) && (
                  <div className="absolute top-0 inset-x-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, #BB5CF6, transparent)' }} />
                )}

                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="font-heading font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full"
                      style={{
                        background: isElite ? 'linear-gradient(90deg, #BB5CF6, #8B5CF6)' : '#BB5CF6',
                        color: 'white',
                        letterSpacing: '0.15em',
                        boxShadow: isElite ? '0 0 20px rgba(187,92,246,0.4)' : 'none',
                      }}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Name */}
                <p className="font-heading font-black text-xs tracking-widest uppercase mb-4"
                  style={{ color: plan.hero || isElite ? '#BB5CF6' : '#475569', letterSpacing: '0.15em' }}>
                  {plan.name}
                </p>

                {/* Price block */}
                {price !== null ? (
                  <div className="mb-5">
                    <div className="flex items-end gap-1 mb-1">
                      {billing === 'annual' && compareAt && (
                        <span className="font-heading text-sm line-through mr-0.5" style={{ color: '#475569' }}>
                          {loading ? '—' : fmt(compareAt, 0)}
                        </span>
                      )}
                      <span className="font-heading font-black text-3xl text-white">
                        {loading ? '—' : fmt(price, 0)}
                      </span>
                      <span className="font-heading text-xs mb-1" style={{ color: '#64748B' }}>
                        /{billing === 'annual' ? (isRTL ? 'سنة' : 'yr') : (isRTL ? 'شهر' : 'mo')}
                      </span>
                    </div>
                    {billing === 'annual' && monthlyEq && saveSAR ? (
                      <div className="flex flex-col gap-0.5">
                        <p className="font-heading text-xs" style={{ color: '#D88BFF' }}>
                          {copy.monthlyEq(loading ? '—' : fmt(monthlyEq, 2))}
                        </p>
                        <p className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>
                          {copy.saveLine(loading ? '—' : fmt(saveSAR, 0))}
                        </p>
                      </div>
                    ) : (
                      <p className="font-heading text-xs" style={{ color: '#475569' }}>
                        {isRTL ? 'تجربة مجانية 7 أيام' : '7-day free trial'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-5">
                    <span className="font-heading font-black text-3xl" style={{ color: '#BB5CF6' }}>
                      {isRTL ? 'مجاني' : 'Free'}
                    </span>
                    <p className="font-heading text-xs mt-1" style={{ color: '#475569' }}>{plan.priceLabel}</p>
                  </div>
                )}

                {/* Features */}
                <ul className="flex flex-col gap-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={12} style={{ color: '#BB5CF6', flexShrink: 0 }} />
                      <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2 opacity-25">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      <span className="font-heading text-xs line-through" style={{ color: '#475569' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={plan.href}
                  className={`block py-3 text-center font-heading font-bold text-sm tracking-wider rounded-xl transition-all duration-200 ${plan.hero ? 'btn-primary' : ''}`}
                  style={plan.hero
                    ? { letterSpacing: '0.1em' }
                    : isElite
                    ? { background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.4)', color: '#E9D5FF', letterSpacing: '0.1em' }
                    : { border: '1px solid rgba(255,255,255,0.08)', color: '#64748B', letterSpacing: '0.1em' }
                  }>
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer links */}
        <div className="text-center mt-10 flex flex-col items-center gap-3">
          <Link href="/pricing"
            className="inline-flex items-center gap-2 font-heading font-semibold text-sm tracking-widest transition-colors"
            style={{ color: '#BB5CF6' }}>
            {copy.compareAll}
            <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={12} style={{ color: '#10B981' }} />
            <p className="font-heading text-xs" style={{ color: '#475569' }}>{copy.trustLine}</p>
          </div>
        </div>

      </div>
    </section>
  )
}
