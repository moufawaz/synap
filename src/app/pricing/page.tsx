'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Star, Lock, Check, X, ChevronRight } from 'lucide-react'
import { useCurrency } from '@/lib/currency'

// ── Base prices in SAR ────────────────────────────────────────────────────────
const PRICES = {
  proMonthly:    { sar: 39.99,  variantId: process.env.NEXT_PUBLIC_LS_PRO_MONTHLY_ID    || '1600605' },
  proAnnual:     { sar: 319.99, variantId: process.env.NEXT_PUBLIC_LS_PRO_ANNUAL_ID     || '1602045' },
  eliteMonthly:  { sar: 69.99,  variantId: process.env.NEXT_PUBLIC_LS_ELITE_MONTHLY_ID  || '' },
  eliteAnnual:   { sar: 559.99, variantId: process.env.NEXT_PUBLIC_LS_ELITE_ANNUAL_ID   || '' },
}

const PRO_COMPARE_AT   = PRICES.proMonthly.sar   * 12  // 479.88
const ELITE_COMPARE_AT = PRICES.eliteMonthly.sar * 12  // 839.88
const PRO_SAVE         = Math.round(PRO_COMPARE_AT   - PRICES.proAnnual.sar)   // 159
const ELITE_SAVE       = Math.round(ELITE_COMPARE_AT - PRICES.eliteAnnual.sar) // 280

// ── Comparison table rows ─────────────────────────────────────────────────────
type RowVal = boolean | string
interface TableRow { label: string; starter: RowVal; pro: RowVal; elite: RowVal }

const TABLE_ROWS: TableRow[] = [
  { label: 'Adaptive diet plan',               starter: true,        pro: true,             elite: true },
  { label: 'Smart workout program',             starter: true,        pro: true,             elite: true },
  { label: 'Body tracking (13 measurements)',   starter: true,        pro: true,             elite: true },
  { label: 'Bilingual Arabic + English',        starter: true,        pro: true,             elite: true },
  { label: 'Daily Ion messages',                starter: '5 / day',   pro: 'Unlimited',      elite: 'Unlimited' },
  { label: 'Barcode food scanner',              starter: false,       pro: true,             elite: true },
  { label: 'Proactive check-ins',               starter: false,       pro: true,             elite: true },
  { label: 'Plan renewal that learns',          starter: false,       pro: true,             elite: true },
  { label: 'Progress photo storage',            starter: false,       pro: true,             elite: true },
  { label: 'Goal timeline prediction',          starter: false,       pro: false,            elite: true },
  { label: 'Weekly body composition report',    starter: false,       pro: false,            elite: true },
  { label: 'Supplement recommendations',        starter: false,       pro: false,            elite: true },
  { label: 'Wearable integration',              starter: false,       pro: 'Coming Soon',    elite: 'Coming Soon' },
  { label: 'Community feed',                    starter: false,       pro: 'Coming Soon',    elite: 'Coming Soon' },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const { fmt, loading: rateLoading } = useCurrency()
  const router = useRouter()

  const proPrice    = billing === 'annual' ? PRICES.proAnnual    : PRICES.proMonthly
  const elitePrice  = billing === 'annual' ? PRICES.eliteAnnual  : PRICES.eliteMonthly
  const proAvailable = Boolean(proPrice.variantId)
  const eliteAvailable = Boolean(elitePrice.variantId)

  const proMonthlyEq    = billing === 'annual' ? PRICES.proAnnual.sar   / 12 : null
  const eliteMonthlyEq  = billing === 'annual' ? PRICES.eliteAnnual.sar / 12 : null

  async function handleCheckout(variantId: string) {
    if (!variantId) { alert('Plan not yet available. Check back soon!'); return }
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
        alert(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-heading font-black text-xl tracking-widest" style={{ color: '#BB5CF6', letterSpacing: '0.15em' }}>
          SYNAP
        </Link>
        <Link href="/dashboard" className="font-heading text-xs tracking-widest" style={{ color: '#475569' }}>
          Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pb-24 pt-8">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.2em' }}>PRICING</p>
          <h1 className="font-heading font-black text-4xl sm:text-5xl text-white tracking-wider mb-4" style={{ letterSpacing: '0.04em' }}>
            Simple, Transparent Pricing
          </h1>
          <p className="font-heading text-base max-w-lg mx-auto" style={{ color: '#64748B' }}>
            7-day free trial. Cancel before day 7 and you&apos;ll never be charged - not even a single riyal.
          </p>

          {/* Zero charge badge */}
          <div className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Shield size={14} style={{ color: '#10B981' }} />
            <span className="font-heading text-xs font-semibold tracking-wider" style={{ color: '#10B981' }}>
              ZERO-CHARGE CANCEL GUARANTEE
            </span>
          </div>
        </div>

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
              Annual
              <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: billing === 'annual' ? 'rgba(255,255,255,0.2)' : 'rgba(187,92,246,0.15)', color: billing === 'annual' ? 'white' : '#BB5CF6' }}>
                SAVE 33%
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
              Monthly
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
              <p className="font-heading text-xs" style={{ color: '#475569' }}>Free forever - no card needed</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text="5 Ion messages / day (7 days)" />
              <PlanFeature text="Adaptive diet plan" />
              <PlanFeature text="Smart workout program" />
              <PlanFeature text="Body tracking (13 measurements)" />
              <PlanFeature text="Bilingual Arabic + English" />
              <PlanFeatureMissing text="Unlimited daily messages" />
              <PlanFeatureMissing text="Barcode food scanner" />
              <PlanFeatureMissing text="Proactive check-ins" />
            </div>

            <Link href="/auth/signup">
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#475569', letterSpacing: '0.08em' }}>
                GET STARTED FREE
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
                MOST POPULAR
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
                  /{billing === 'annual' ? 'yr' : 'mo'}
                </span>
              </div>
              {billing === 'annual' && proMonthlyEq ? (
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-xs" style={{ color: '#D88BFF' }}>
                    {rateLoading ? '...' : fmt(proMonthlyEq, 2)}/month equivalent
                  </p>
                  <p className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>
                    Save {rateLoading ? '...' : fmt(PRO_SAVE, 0)} - 3 months free
                  </p>
                </div>
              ) : (
                <p className="font-heading text-xs" style={{ color: '#475569' }}>Switch to annual and save 33%</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text="Unlimited Ion messages / day" highlight />
              <PlanFeature text="Everything in Starter" />
              <PlanFeature text="7-day free trial" />
              <PlanFeature text="Barcode food scanner" />
              <PlanFeature text="Proactive check-ins" />
              <PlanFeature text="Plan renewal that learns" />
              <PlanFeature text="Progress photo storage" />
              <PlanFeatureMissing text="Goal timeline prediction" />
              <PlanFeatureMissing text="Weekly body composition report" />
              <PlanFeatureMissing text="Supplement recommendations" />
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
                <>COMING SOON</>
              ) : loading === proPrice.variantId ? (
                <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> LOADING...</>
              ) : (
                <>START FREE TRIAL <ChevronRight size={14} /></>
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
          BEST VALUE
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
                  /{billing === 'annual' ? 'yr' : 'mo'}
                </span>
              </div>
              {billing === 'annual' && eliteMonthlyEq ? (
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-xs" style={{ color: '#D88BFF' }}>
                    {rateLoading ? '...' : fmt(eliteMonthlyEq, 2)}/month equivalent
                  </p>
                  <p className="font-heading text-xs font-bold" style={{ color: '#10B981' }}>
                    Save {rateLoading ? '...' : fmt(ELITE_SAVE, 0)} - 3 months free
                  </p>
                </div>
              ) : (
                <p className="font-heading text-xs" style={{ color: '#475569' }}>Switch to annual and save 33%</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              <PlanFeature text="Everything in Pro" highlight />
              <PlanFeature text="7-day free trial" />
              <PlanFeature text="Goal timeline prediction" highlight />
              <PlanFeature text="Weekly body composition report" highlight />
              <PlanFeature text="Supplement recommendations" highlight />
              <PlanFeature text="Wearable integration (coming soon)" />
              <PlanFeature text="Community feed (coming soon)" />
              <PlanFeature text="First access to new features" />
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
                <>COMING SOON</>
              ) : loading === elitePrice.variantId ? (
                <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#BB5CF6', borderTopColor: 'transparent' }} /> LOADING...</>
              ) : (
                <>START FREE TRIAL <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>

        {/* Trust bar */}
        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          <TrustCard
            icon={<Shield size={20} style={{ color: '#10B981' }} />}
            title="Zero-Charge Trial"
            desc="Cancel before day 7 and you will never be billed. Not a single riyal. Our guarantee."
          />
          <TrustCard
            icon={<Lock size={20} style={{ color: '#BB5CF6' }} />}
            title="Secure Payments"
            desc="Powered by Lemon Squeezy. All transactions encrypted. No card data stored on our servers."
          />
          <TrustCard
            icon={<Star size={20} style={{ color: '#F59E0B' }} />}
            title="Cancel Anytime"
            desc="No contracts. No cancellation fees. One click to cancel from Settings > Billing."
          />
        </div>

        {/* Full feature comparison table */}
        <div className="mb-16">
          <p className="font-heading font-black text-sm text-white text-center mb-8 tracking-wider" style={{ letterSpacing: '0.1em' }}>
            FULL FEATURE COMPARISON
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
                  <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{row.label}</span>
                </div>
                {([row.starter, row.pro, row.elite] as RowVal[]).map((val, ci) => (
                  <div key={ci} className="p-4 flex items-center justify-center">
                    <TableCell value={val} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <p className="font-heading font-black text-sm text-white text-center mb-6 tracking-wider" style={{ letterSpacing: '0.1em' }}>
            FREQUENTLY ASKED QUESTIONS
          </p>
          <div className="flex flex-col gap-4">
            <FAQ
              q="Will I be charged if I cancel during the trial?"
              a="Absolutely not. If you cancel before day 7 of your trial, you will never be charged. You'll get a confirmation from Ion the moment you cancel."
            />
            <FAQ
              q="What happens when the trial ends?"
              a="On day 7, your chosen plan activates and you're billed the full amount. Ion will remind you on days 5 and 6 so you have time to decide."
            />
            <FAQ
              q="What does Elite have that Pro doesn't?"
              a="Elite adds three powerful features: Goal Timeline Prediction (Ion tells you exactly when you'll hit your goal), Weekly Body Composition Reports (every Friday, full analysis delivered to your inbox), and Supplement Recommendations (personalised to your diet gaps and training, with local Saudi suppliers)."
            />
            <FAQ
              q="Can I switch between plans?"
              a="Yes. Upgrade or downgrade anytime from Settings > Billing. Changes take effect on your next billing cycle."
            />
            <FAQ
              q="Is SAR the only currency?"
              a="No. We automatically detect your location and show a converted price. Checkout is available in your preferred currency."
            />
            <FAQ
              q="What payment methods are accepted?"
              a="All major credit and debit cards (Visa, Mastercard, Mada), Apple Pay, and local payment methods - all handled securely by Lemon Squeezy."
            />
            <FAQ
              q="Can I cancel anytime?"
              a="Yes - no contracts, no cancellation fees, no questions asked. One click in Settings > Billing. If you cancel during the trial, you owe nothing."
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

function TableCell({ value }: { value: RowVal }) {
  if (value === true)  return <Check size={15} style={{ color: '#BB5CF6' }} />
  if (value === false) return <X    size={15} style={{ color: '#1E293B' }} />
  return <span className="font-heading text-xs font-bold" style={{ color: value === 'Unlimited' ? '#BB5CF6' : '#64748B' }}>{value}</span>
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
