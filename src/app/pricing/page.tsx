'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Star, Lock, Check, X, ChevronRight, Globe } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { useLanguage } from '@/lib/useLanguage'

import { PRICING } from '@/lib/pricing'

// ── Base prices in SAR ────────────────────────────────────────────────────────
const PRICES = {
  proMonthly:   PRICING.pro.monthly,
  proAnnual:    PRICING.pro.annual,
  eliteMonthly: PRICING.elite.monthly,
  eliteAnnual:  PRICING.elite.annual,
}

const PRO_SAVE   = PRICING.pro.annual.savingsSar    // 159.99
const ELITE_SAVE = PRICING.elite.annual.savingsSar  // 279.99

// ── Comparison table rows ─────────────────────────────────────────────────────
type RowVal = boolean | string
interface TableRow { label: string; labelAr: string; starter: RowVal; pro: RowVal; elite: RowVal }

const TABLE_ROWS: TableRow[] = [
  { label: 'Adaptive diet plan',               labelAr: 'خطة تغذية متكيفة', starter: true,        pro: true,             elite: true },
  { label: 'Smart workout program',            labelAr: 'برنامج تمرين ذكي', starter: true,        pro: true,             elite: true },
  { label: 'Body tracking (13 measurements)',  labelAr: 'تتبع الجسم (13 قياس)', starter: true,        pro: true,             elite: true },
  { label: 'Bilingual Arabic + English',       labelAr: 'العربية والإنجليزية', starter: true,        pro: true,             elite: true },
  { label: 'Daily Ion messages',               labelAr: 'رسائل Ion اليومية', starter: '5 / day',   pro: 'Unlimited',      elite: 'Unlimited' },
  { label: 'Barcode food scanner',             labelAr: 'ماسح باركود الطعام', starter: false,       pro: true,             elite: true },
  { label: 'Proactive check-ins',              labelAr: 'متابعات استباقية', starter: false,       pro: true,             elite: true },
  { label: 'Plan renewal that learns',         labelAr: 'تجديد خطة يتعلم من نتائجك', starter: false,       pro: true,             elite: true },
  { label: 'Progress photo storage',           labelAr: 'حفظ صور التقدم', starter: false,       pro: true,             elite: true },
  { label: 'Goal timeline prediction',         labelAr: 'توقع موعد الوصول للهدف', starter: false,       pro: false,            elite: true },
  { label: 'Weekly body composition report',   labelAr: 'تقرير تكوين الجسم الأسبوعي', starter: false,       pro: false,            elite: true },
  { label: 'Supplement recommendations',       labelAr: 'توصيات المكملات', starter: false,       pro: false,            elite: true },
  { label: 'Wearable integration',             labelAr: 'ربط الأجهزة القابلة للارتداء', starter: false,       pro: 'Coming Soon',    elite: 'Coming Soon' },
  { label: 'Community feed',                   labelAr: 'المجتمع', starter: false,       pro: 'Coming Soon',    elite: 'Coming Soon' },
]

export default function PricingPage() {
  const { lang, setLang, isRTL } = useLanguage()
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const { fmt, loading: rateLoading } = useCurrency()
  const router = useRouter()

  const proPrice    = billing === 'annual' ? PRICES.proAnnual    : PRICES.proMonthly
  const elitePrice  = billing === 'annual' ? PRICES.eliteAnnual  : PRICES.eliteMonthly
  const proAvailable = Boolean(proPrice.variantId)
  const eliteAvailable = Boolean(elitePrice.variantId)

  const proMonthlyEq    = billing === 'annual' ? PRICES.proAnnual.sar   / 12 : null
  const eliteMonthlyEq  = billing === 'annual' ? PRICES.eliteAnnual.sar / 12 : null
  const copy = isRTL ? {
    pricing: 'الأسعار',
    title: 'أسعار واضحة وبسيطة',
    subtitle: 'تجربة مجانية 7 أيام. ألغِ قبل اليوم السابع ولن يتم خصم أي مبلغ.',
    guarantee: 'ضمان الإلغاء بدون رسوم',
    annual: 'سنوي',
    monthly: 'شهري',
    save33: 'وفر 33%',
    starterDesc: 'مجاني دائماً - بدون بطاقة',
    getStarted: 'ابدأ مجاناً',
    mostPopular: 'الأكثر اختياراً',
    bestValue: 'أفضل قيمة',
    year: 'سنة',
    month: 'شهر',
    monthEquivalent: 'شهرياً تقريباً',
    save: 'وفر',
    threeMonthsFree: '3 أشهر مجانية',
    annualPrompt: 'اختر السنوي ووفر 33%',
    comingSoon: 'قريباً',
    loading: 'جاري التحميل...',
    startTrial: 'ابدأ التجربة المجانية',
    fullComparison: 'مقارنة الميزات',
    securePayments: 'مدفوعات آمنة',
    zeroTrial: 'تجربة بدون خصم',
    cancelAnytime: 'إلغاء في أي وقت',
    secureDesc: 'الدفع عبر Lemon Squeezy. المعاملات مشفرة ولا نحفظ بيانات البطاقة على خوادمنا.',
    zeroDesc: 'ألغِ قبل اليوم السابع ولن يتم خصم أي مبلغ. هذا ضماننا.',
    cancelDesc: 'بدون عقود أو رسوم إلغاء. الإلغاء من الإعدادات > الفوترة.',
  } : {
    pricing: 'PRICING',
    title: 'Simple, Transparent Pricing',
    subtitle: "7-day free trial. Cancel before day 7 and you'll never be charged - not even a single riyal.",
    guarantee: 'ZERO-CHARGE CANCEL GUARANTEE',
    annual: 'Annual',
    monthly: 'Monthly',
    save33: 'SAVE 33%',
    starterDesc: 'Free forever - no card needed',
    getStarted: 'GET STARTED FREE',
    mostPopular: 'MOST POPULAR',
    bestValue: 'BEST VALUE',
    year: 'yr',
    month: 'mo',
    monthEquivalent: 'month equivalent',
    save: 'Save',
    threeMonthsFree: '3 months free',
    annualPrompt: 'Switch to annual and save 33%',
    comingSoon: 'COMING SOON',
    loading: 'LOADING...',
    startTrial: 'START FREE TRIAL',
    fullComparison: 'FULL FEATURE COMPARISON',
    securePayments: 'Secure Payments',
    zeroTrial: 'Zero-Charge Trial',
    cancelAnytime: 'Cancel Anytime',
    secureDesc: 'Powered by Lemon Squeezy. All transactions encrypted. No card data stored on our servers.',
    zeroDesc: 'Cancel before day 7 and you will never be billed. Not a single riyal. Our guarantee.',
    cancelDesc: 'No contracts. No cancellation fees. One click to cancel from Settings > Billing.',
  }

  async function handleCheckout(variantId: string) {
    if (!variantId) { setCheckoutError('Plan not yet available. Check back soon!'); return }
    setCheckoutError('')
    setLoading(variantId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'Unauthorized') {
        router.push('/auth/login?next=/pricing')
      } else {
        setCheckoutError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setCheckoutError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between gap-4 max-w-6xl mx-auto">
        <Link href="/" className="font-heading font-black text-xl tracking-widest" style={{ color: '#BB5CF6', letterSpacing: '0.15em' }}>
          SYNAP
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-heading text-xs font-semibold"
            style={{ color: '#64748B', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Globe size={12} /> {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <Link href="/dashboard" className="font-heading text-xs tracking-widest" style={{ color: '#475569' }}>
            {isRTL ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pb-24 pt-8">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.2em' }}>{copy.pricing}</p>
          <h1 className="font-heading font-black text-4xl sm:text-5xl text-white tracking-wider mb-4" style={{ letterSpacing: '0.04em' }}>
            {copy.title}
          </h1>
          <p className="font-heading text-base max-w-lg mx-auto" style={{ color: '#64748B' }}>
            {copy.subtitle}
          </p>

          {/* Zero charge badge */}
          <div className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Shield size={14} style={{ color: '#10B981' }} />
            <span className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#10B981' }}>
              {copy.guarantee}
            </span>
          </div>
        </div>

        {checkoutError && (
          <div className="max-w-xl mx-auto mb-8 rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
            <p className="font-heading text-sm" style={{ color: '#FCA5A5' }}>{checkoutError}</p>
          </div>
        )}

        {/* Billing toggle — annual default */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setBilling('annual')}
              className="relative px-6 py-2.5 rounded-xl font-heading text-sm font-bold tracking-wider transition-all"
              style={{
                background: billing === 'annual' ? '#BB5CF6' : 'transparent',
                color: billing === 'annual' ? 'white' : '#475569',
                boxShadow: billing === 'annual' ? '0 0 20px rgba(187,92,246,0.3)' : 'none',
              }}
            >
              {copy.annual}{' '}
              <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: billing === 'annual' ? 'rgba(255,255,255,0.2)' : 'rgba(187,92,246,0.15)', color: billing === 'annual' ? 'white' : '#BB5CF6' }}>
                {copy.save33}
              </span>
            </button>
            <button
              onClick={() => setBilling('monthly')}
              className="px-6 py-2.5 rounded-xl font-heading text-sm font-bold tracking-wider transition-all"
              style={{
                background: billing === 'monthly' ? '#BB5CF6' : 'transparent',
                color: billing === 'monthly' ? 'white' : '#475569',
              }}
            >
              {copy.monthly}
            </button>
          </div>
        </div>

        {/* Plans grid — 3 cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-14">

          {/* ── Starter ── */}
          <div className="rounded-2xl p-6 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="mb-6">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#475569', letterSpacing: '0.15em' }}>STARTER</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-heading font-black text-4xl text-white">0</span>
                <span className="font-heading text-sm mb-1.5" style={{ color: '#64748B' }}> SAR</span>
              </div>
              <p className="font-heading text-xs" style={{ color: '#475569' }}>{copy.starterDesc}</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text={isRTL ? '5 رسائل Ion يومياً (7 أيام)' : '5 Ion messages / day (7 days)'} />
              <PlanFeature text={isRTL ? 'خطة تغذية متكيفة' : 'Adaptive diet plan'} />
              <PlanFeature text={isRTL ? 'برنامج تمرين ذكي' : 'Smart workout program'} />
              <PlanFeature text={isRTL ? 'تتبع الجسم (13 قياس)' : 'Body tracking (13 measurements)'} />
              <PlanFeature text={isRTL ? 'العربية والإنجليزية' : 'Bilingual Arabic + English'} />
              <PlanFeatureMissing text={isRTL ? 'رسائل يومية غير محدودة' : 'Unlimited daily messages'} />
              <PlanFeatureMissing text={isRTL ? 'ماسح باركود الطعام' : 'Barcode food scanner'} />
              <PlanFeatureMissing text={isRTL ? 'متابعات استباقية' : 'Proactive check-ins'} />
            </div>

            <Link href="/auth/signup">
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#475569', letterSpacing: '0.08em' }}>
                {copy.getStarted}
              </button>
            </Link>
          </div>

          {/* ── Pro — MOST POPULAR ── */}
          <div className="rounded-2xl p-6 flex flex-col relative" style={{
            background: 'linear-gradient(135deg, rgba(187,92,246,0.12), rgba(187,92,246,0.06))',
            border: '1px solid rgba(187,92,246,0.4)',
            boxShadow: '0 0 40px rgba(187,92,246,0.15)',
          }}>
            {/* Top accent */}
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #BB5CF6, transparent)' }} />

            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="font-heading font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full"
                style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.15em' }}>
                {copy.mostPopular}
              </span>
            </div>

            <div className="mb-6">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.15em' }}>PRO</p>
              <div className="flex items-end gap-1 mb-1">
                {billing === 'annual' && (
                  <span className="font-heading text-base line-through mr-1" style={{ color: '#475569' }}>
                    {rateLoading ? '...' : fmt(PRO_COMPARE_AT, 0)}
                  </span>
                )}
                <span className="font-heading font-black text-4xl text-white">
                  {rateLoading ? '...' : fmt(proPrice.sar, 0)}
                </span>
                <span className="font-heading text-sm mb-1.5" style={{ color: '#64748B' }}>
                  /{billing === 'annual' ? copy.year : copy.month}
                </span>
              </div>
              {billing === 'annual' && proMonthlyEq ? (
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-xs" style={{ color: '#D88BFF' }}>
                    {rateLoading ? '...' : fmt(proMonthlyEq, 2)}/{copy.monthEquivalent}
                  </p>
                  <p className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>
                    {copy.save} {rateLoading ? '...' : fmt(PRO_SAVE, 0)} - {copy.threeMonthsFree}
                  </p>
                </div>
              ) : (
                <p className="font-heading text-xs" style={{ color: '#475569' }}>{copy.annualPrompt}</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text={isRTL ? 'رسائل Ion غير محدودة يومياً' : 'Unlimited Ion messages / day'} highlight />
              <PlanFeature text={isRTL ? 'كل ميزات Starter' : 'Everything in Starter'} />
              <PlanFeature text={isRTL ? 'تجربة مجانية 7 أيام' : '7-day free trial'} />
              <PlanFeature text={isRTL ? 'ماسح باركود الطعام' : 'Barcode food scanner'} />
              <PlanFeature text={isRTL ? 'متابعات استباقية' : 'Proactive check-ins'} />
              <PlanFeature text={isRTL ? 'تجديد خطة يتعلم من نتائجك' : 'Plan renewal that learns'} />
              <PlanFeature text={isRTL ? 'حفظ صور التقدم' : 'Progress photo storage'} />
              <PlanFeatureMissing text={isRTL ? 'توقع موعد الوصول للهدف' : 'Goal timeline prediction'} />
              <PlanFeatureMissing text={isRTL ? 'تقرير تكوين الجسم الأسبوعي' : 'Weekly body composition report'} />
              <PlanFeatureMissing text={isRTL ? 'توصيات المكملات' : 'Supplement recommendations'} />
            </div>

            <button
              onClick={() => handleCheckout(proPrice.variantId)}
              disabled={!!loading || !proAvailable}
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              style={{
                background: loading === proPrice.variantId ? 'rgba(187,92,246,0.5)' : '#BB5CF6',
                color: 'white',
                letterSpacing: '0.1em',
                boxShadow: '0 0 25px rgba(187,92,246,0.35)',
              }}
            >
              {!proAvailable ? (
                <>{copy.comingSoon}</>
              ) : loading === proPrice.variantId ? (
                <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> {copy.loading}</>
              ) : (
                <>{copy.startTrial} <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} /></>
              )}
            </button>
          </div>

          {/* ── BEST VALUE ── */}
          <div className="rounded-2xl p-6 flex flex-col relative" style={{
            background: 'linear-gradient(135deg, rgba(187,92,246,0.18), rgba(139,92,246,0.10))',
            border: '1.5px solid rgba(187,92,246,0.55)',
            boxShadow: '0 0 60px rgba(187,92,246,0.22), inset 0 0 40px rgba(187,92,246,0.04)',
          }}>
            {/* Top accent — brighter */}
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #BB5CF6 40%, #8B5CF6, transparent)' }} />

            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="font-heading font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #BB5CF6, #8B5CF6)', color: 'white', letterSpacing: '0.15em', boxShadow: '0 0 20px rgba(187,92,246,0.5)' }}>
          {copy.bestValue}
              </span>
            </div>

            <div className="mb-6">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.15em' }}>ELITE</p>
              <div className="flex items-end gap-1 mb-1">
                {billing === 'annual' && (
                  <span className="font-heading text-base line-through mr-1" style={{ color: '#475569' }}>
                    {rateLoading ? '...' : fmt(ELITE_COMPARE_AT, 0)}
                  </span>
                )}
                <span className="font-heading font-black text-4xl text-white">
                  {rateLoading ? '...' : fmt(elitePrice.sar, 0)}
                </span>
                <span className="font-heading text-sm mb-1.5" style={{ color: '#64748B' }}>
                  /{billing === 'annual' ? copy.year : copy.month}
                </span>
              </div>
              {billing === 'annual' && eliteMonthlyEq ? (
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-xs" style={{ color: '#D88BFF' }}>
                    {rateLoading ? '...' : fmt(eliteMonthlyEq, 2)}/{copy.monthEquivalent}
                  </p>
                  <p className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>
                    {copy.save} {rateLoading ? '...' : fmt(ELITE_SAVE, 0)} - {copy.threeMonthsFree}
                  </p>
                </div>
              ) : (
                <p className="font-heading text-xs" style={{ color: '#475569' }}>{copy.annualPrompt}</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text={isRTL ? 'كل ميزات Pro' : 'Everything in Pro'} highlight />
              <PlanFeature text={isRTL ? 'تجربة مجانية 7 أيام' : '7-day free trial'} />
              <PlanFeature text={isRTL ? 'توقع موعد الوصول للهدف' : 'Goal timeline prediction'} highlight />
              <PlanFeature text={isRTL ? 'تقرير تكوين الجسم الأسبوعي' : 'Weekly body composition report'} highlight />
              <PlanFeature text={isRTL ? 'توصيات المكملات' : 'Supplement recommendations'} highlight />
              <PlanFeature text={isRTL ? 'ربط الأجهزة القابلة للارتداء (قريباً)' : 'Wearable integration (coming soon)'} />
              <PlanFeature text={isRTL ? 'المجتمع (قريباً)' : 'Community feed (coming soon)'} />
              <PlanFeature text={isRTL ? 'وصول مبكر للميزات الجديدة' : 'First access to new features'} />
            </div>

            <button
              onClick={() => handleCheckout(elitePrice.variantId)}
              disabled={!!loading || !eliteAvailable}
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              style={{
                background: loading === elitePrice.variantId ? 'rgba(187,92,246,0.4)' : 'rgba(187,92,246,0.2)',
                border: '1px solid rgba(187,92,246,0.5)',
                color: loading === elitePrice.variantId ? '#94A3B8' : '#E9D5FF',
                letterSpacing: '0.1em',
              }}
            >
              {!eliteAvailable ? (
                <>{copy.comingSoon}</>
              ) : loading === elitePrice.variantId ? (
                <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} /> {copy.loading}</>
              ) : (
                <>{copy.startTrial} <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} /></>
              )}
            </button>
          </div>
        </div>

        {/* Trust bar */}
        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          <TrustCard
            icon={<Shield size={20} style={{ color: '#10B981' }} />}
            title={copy.zeroTrial}
            desc={copy.zeroDesc}
          />
          <TrustCard
            icon={<Lock size={20} style={{ color: '#BB5CF6' }} />}
            title={copy.securePayments}
            desc={copy.secureDesc}
          />
          <TrustCard
            icon={<Star size={20} style={{ color: '#F59E0B' }} />}
            title={copy.cancelAnytime}
            desc={copy.cancelDesc}
          />
        </div>

        {/* Full feature comparison table */}
        <div className="mb-16">
          <p className="font-heading font-black text-sm text-white text-center mb-8 tracking-wider" style={{ letterSpacing: '0.1em' }}>
            {copy.fullComparison}
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Table header */}
            <div className="grid grid-cols-4 gap-0" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-4" />
              {(['STARTER', 'PRO', 'ELITE'] as const).map((h, i) => (
                <div key={h} className="p-4 text-center">
                  <p className="font-heading font-black text-xs tracking-widest" style={{ color: i === 2 ? '#BB5CF6' : i === 1 ? '#BB5CF6' : '#475569', letterSpacing: '0.12em' }}>{h}</p>
                </div>
              ))}
            </div>

            {/* Rows */}
            {TABLE_ROWS.map((row, idx) => (
              <div key={row.label} className="grid grid-cols-4 gap-0"
                style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', borderBottom: idx < TABLE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="p-4 flex items-center">
                  <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{isRTL ? row.labelAr : row.label}</span>
                </div>
                {([row.starter, row.pro, row.elite] as RowVal[]).map((val, ci) => (
                  <div key={ci} className="p-4 flex items-center justify-center">
                    <TableCell value={val} isRTL={isRTL} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <p className="font-heading font-black text-sm text-white text-center mb-6 tracking-wider" style={{ letterSpacing: '0.1em' }}>
            {isRTL ? 'الأسئلة الشائعة' : 'FREQUENTLY ASKED QUESTIONS'}
          </p>
          <div className="flex flex-col gap-4">
            <FAQ
              q={isRTL ? 'هل سيتم الخصم إذا ألغيت أثناء التجربة؟' : 'Will I be charged if I cancel during the trial?'}
              a={isRTL ? 'لا. إذا ألغيت قبل اليوم السابع فلن يتم خصم أي مبلغ، وستصلك رسالة تأكيد من Ion فور الإلغاء.' : "Absolutely not. If you cancel before day 7 of your trial, you will never be charged. You'll get a confirmation from Ion the moment you cancel."}
            />
            <FAQ
              q={isRTL ? 'ماذا يحدث عند انتهاء التجربة؟' : 'What happens when the trial ends?'}
              a={isRTL ? 'في اليوم السابع تبدأ الخطة التي اخترتها ويتم الخصم. Ion يذكرك في اليومين الخامس والسادس حتى تقرر براحتك.' : "On day 7, your chosen plan activates and you're billed the full amount. Ion will remind you on days 5 and 6 so you have time to decide."}
            />
            <FAQ
              q={isRTL ? 'ما الذي تضيفه Elite عن Pro؟' : "What does Elite have that Pro doesn't?"}
              a={isRTL ? 'Elite تضيف توقع موعد الوصول للهدف، تقرير تكوين الجسم الأسبوعي، وتوصيات مكملات مخصصة حسب غذائك وتمرينك مع أماكن شراء مناسبة في السعودية.' : "Elite adds three powerful features: Goal Timeline Prediction (Ion tells you exactly when you'll hit your goal), Weekly Body Composition Reports (every Friday, full analysis delivered to your inbox), and Supplement Recommendations (personalised to your diet gaps and training, with local Saudi suppliers)."}
            />
            <FAQ
              q={isRTL ? 'هل يمكنني تغيير الخطة؟' : 'Can I switch between plans?'}
              a={isRTL ? 'نعم. يمكنك الترقية أو التخفيض من الإعدادات > الفوترة، وتطبق التغييرات في دورة الفوترة التالية.' : 'Yes. Upgrade or downgrade anytime from Settings > Billing. Changes take effect on your next billing cycle.'}
            />
            <FAQ
              q={isRTL ? 'هل الريال السعودي هو العملة الوحيدة؟' : 'Is SAR the only currency?'}
              a={isRTL ? 'لا. نكتشف موقعك تلقائياً ونظهر السعر المحول، والدفع متاح بالعملة المناسبة لك.' : 'No. We automatically detect your location and show a converted price. Checkout is available in your preferred currency.'}
            />
            <FAQ
              q={isRTL ? 'ما طرق الدفع المقبولة؟' : 'What payment methods are accepted?'}
              a={isRTL ? 'نقبل البطاقات الرئيسية مثل Visa وMastercard وMada وApple Pay وطرق الدفع المحلية، وكلها تتم بأمان عبر Lemon Squeezy.' : 'All major credit and debit cards (Visa, Mastercard, Mada), Apple Pay, and local payment methods - all handled securely by Lemon Squeezy.'}
            />
            <FAQ
              q={isRTL ? 'هل يمكنني الإلغاء في أي وقت؟' : 'Can I cancel anytime?'}
              a={isRTL ? 'نعم، بدون عقود أو رسوم إلغاء. من الإعدادات > الفوترة. إذا ألغيت أثناء التجربة فلن تدفع شيئاً.' : 'Yes - no contracts, no cancellation fees, no questions asked. One click in Settings > Billing. If you cancel during the trial, you owe nothing.'}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlanFeature({ text, highlight = false }: { text: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(187,92,246,0.15)' }}>
        <Check size={9} style={{ color: '#BB5CF6' }} />
      </div>
      <span className="font-heading text-xs" style={{ color: highlight ? 'white' : '#94A3B8', fontWeight: highlight ? '700' : '400' }}>
        {text}
      </span>
    </div>
  )
}

function PlanFeatureMissing({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 opacity-30">
      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      <span className="font-heading text-xs line-through" style={{ color: '#475569' }}>{text}</span>
    </div>
  )
}

function TableCell({ value, isRTL }: { value: RowVal; isRTL: boolean }) {
  if (value === true)  return <Check size={15} style={{ color: '#BB5CF6' }} />
  if (value === false) return <X    size={15} style={{ color: '#1E293B' }} />
  const text = isRTL
    ? value === 'Unlimited' ? 'غير محدود' : value === 'Coming Soon' ? 'قريباً' : value
    : value
  return <span className="font-heading text-xs font-bold" style={{ color: value === 'Unlimited' ? '#BB5CF6' : '#64748B' }}>{text}</span>
}

function TrustCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-heading font-black text-sm text-white tracking-wider mb-1.5" style={{ letterSpacing: '0.06em' }}>{title}</p>
      <p className="font-heading text-xs leading-relaxed" style={{ color: '#475569' }}>{desc}</p>
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-heading font-bold text-sm text-white mb-2">{q}</p>
      <p className="font-heading text-xs leading-relaxed" style={{ color: '#64748B' }}>{a}</p>
    </div>
  )
}
