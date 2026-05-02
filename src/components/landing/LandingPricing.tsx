'use client'

import Link from 'next/link'
import { Check, ArrowRight, Shield } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { type Language } from '@/lib/i18n'

interface Props { lang: Language }

export default function LandingPricing({ lang }: Props) {
  const { fmt, loading } = useCurrency()
  const isRTL = lang === 'ar'

  const plans = [
    {
      name: 'FREE',
      priceSAR: null as number | null,
      badge: null as string | null,
      features: isRTL
        ? ['5 رسائل يومياً مع Ion', 'خطة AI كاملة 12 أسبوع', 'تتبع التمرين والتغذية', 'قياسات التقدم']
        : ['5 Ion messages/day', 'Full 12-week AI plan', 'Workout & nutrition tracking', 'Progress measurements'],
      cta: isRTL ? 'ابدأ مجاناً' : 'Start Free',
      href: '/auth/signup',
      highlight: false,
    },
    {
      name: 'PRO',
      priceSAR: 289.99 / 12,
      badge: isRTL ? 'الأكثر شعبية' : 'MOST POPULAR',
      features: isRTL
        ? ['30 رسالة يومياً مع Ion', 'كل مزايا المجاني', 'تكييف الخطة بواسطة Ion', 'دعم ذو أولوية']
        : ['30 Ion messages/day', 'Everything in Free', 'Plan adaptation by Ion', 'Priority support'],
      cta: isRTL ? 'جرب مجاناً 7 أيام' : 'Try Free for 7 Days',
      href: '/pricing',
      highlight: true,
    },
    {
      name: 'PRO+',
      priceSAR: 369.99 / 12,
      badge: isRTL ? 'غير محدود' : 'UNLIMITED',
      features: isRTL
        ? ['رسائل Ion غير محدودة', 'كل مزايا برو', 'ملخصات شهرية بالذكاء الاصطناعي', 'وصول مبكر للمزايا']
        : ['Unlimited Ion messages', 'Everything in Pro', 'Monthly AI summaries', 'Early feature access'],
      cta: isRTL ? 'جرب مجاناً 7 أيام' : 'Try Free for 7 Days',
      href: '/pricing',
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[600px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'rgba(187,92,246,0.06)' }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="text-center mb-14">
          <div className="section-label justify-center mb-4">
            <span>{isRTL ? 'الأسعار' : 'PRICING'}</span>
          </div>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-wider mb-3"
            style={{ letterSpacing: '0.04em' }}>
            {isRTL ? 'أسعار شفافة وبسيطة' : 'Simple, Transparent Pricing'}
          </h2>
          <p className="font-heading text-sm" style={{ color: '#64748B' }}>
            {isRTL ? 'أسعار سنوية — وفّر حتى 30% مقارنةً بالشهري' : 'Annual pricing shown — save up to 30% vs monthly'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan.name} className="relative glass-card flex flex-col overflow-hidden"
              style={plan.highlight ? { border: '1px solid rgba(187,92,246,0.4)', boxShadow: '0 0 40px rgba(187,92,246,0.12)' } : {}}>
              {plan.highlight && (
                <div className="absolute top-0 inset-x-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, #BB5CF6, transparent)' }} />
              )}
              <div className="p-6 flex flex-col flex-1 gap-5">
                <div>
                  {plan.badge && (
                    <span className="inline-block mb-3 px-3 py-1 rounded-full font-heading text-xs font-bold tracking-widest"
                      style={{ background: 'rgba(187,92,246,0.12)', color: '#BB5CF6', border: '1px solid rgba(187,92,246,0.25)' }}>
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="font-heading font-black text-xl text-white tracking-widest mb-3">{plan.name}</h3>
                  {plan.priceSAR ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading font-black text-3xl text-white">
                          {loading ? '—' : fmt(plan.priceSAR, 0)}
                        </span>
                        <span className="font-heading text-xs" style={{ color: '#475569' }}>/mo</span>
                      </div>
                      <p className="font-heading text-xs mt-1" style={{ color: '#475569' }}>
                        {isRTL ? 'يُفوتر سنوياً · تجربة مجانية 7 أيام' : 'billed annually · 7-day free trial'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="font-heading font-black text-3xl" style={{ color: '#BB5CF6' }}>
                        {isRTL ? 'مجاني' : 'Free'}
                      </span>
                      <p className="font-heading text-xs mt-1" style={{ color: '#475569' }}>
                        {isRTL ? 'دائماً، بدون بطاقة' : 'forever, no card needed'}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check size={13} style={{ color: plan.highlight ? '#BB5CF6' : '#10B981', flexShrink: 0 }} />
                      <span className="font-heading text-xs tracking-wider" style={{ color: '#94A3B8' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className={plan.highlight
                    ? 'btn-primary py-3 text-center font-heading font-bold text-sm tracking-wider'
                    : 'block py-3 text-center font-heading font-bold text-sm tracking-wider rounded-xl transition-all duration-200'}
                  style={plan.highlight
                    ? { letterSpacing: '0.1em' }
                    : { letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}>
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 flex flex-col items-center gap-3">
          <Link href="/pricing"
            className="inline-flex items-center gap-2 font-heading font-semibold text-sm tracking-widest transition-colors"
            style={{ color: '#BB5CF6' }}>
            {isRTL ? 'مقارنة جميع الخطط والمزايا' : 'Compare all plans & features'}
            <ArrowRight size={14} />
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={12} style={{ color: '#10B981' }} />
            <p className="font-heading text-xs" style={{ color: '#475569' }}>
              {isRTL ? 'ضمان الإلغاء بدون رسوم قبل اليوم 7' : 'Zero-charge cancel guarantee before day 7'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
