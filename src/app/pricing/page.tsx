'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Zap, Infinity as InfinityIcon, Check, ChevronRight, Star, Lock } from 'lucide-react'
import { useCurrency } from '@/lib/currency'

// ── Base prices in SAR ────────────────────────────────────────
const PRICES = {
  proMonthly:      { sar: 34.99, variantId: process.env.NEXT_PUBLIC_LS_PRO_MONTHLY_ID      || '1600605' },
  proAnnual:       { sar: 289.99, variantId: process.env.NEXT_PUBLIC_LS_PRO_ANNUAL_ID       || '1602045' },
  unlimitedMonthly:{ sar: 44.99, variantId: process.env.NEXT_PUBLIC_LS_UNLIMITED_MONTHLY_ID || '1602017' },
  unlimitedAnnual: { sar: 369.99, variantId: process.env.NEXT_PUBLIC_LS_UNLIMITED_ANNUAL_ID || '1602053' },
  extraChat:       { sar: 9.99,  variantId: process.env.NEXT_PUBLIC_LS_EXTRA_CHAT_ID       || '1600640' },
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const { fmt, loading: rateLoading } = useCurrency()
  const router = useRouter()

  const proPrice     = billing === 'annual' ? PRICES.proAnnual     : PRICES.proMonthly
  const unlimPrice   = billing === 'annual' ? PRICES.unlimitedAnnual : PRICES.unlimitedMonthly

  const proMonthlyEq   = billing === 'annual' ? PRICES.proAnnual.sar / 12 : null
  const unlimMonthlyEq = billing === 'annual' ? PRICES.unlimitedAnnual.sar / 12 : null

  const proSavings   = billing === 'annual' ? Math.round((1 - PRICES.proAnnual.sar / (PRICES.proMonthly.sar * 12)) * 100) : 0
  const unlimSavings = billing === 'annual' ? Math.round((1 - PRICES.unlimitedAnnual.sar / (PRICES.unlimitedMonthly.sar * 12)) * 100) : 0

  async function handleCheckout(variantId: string, planLabel: string) {
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
    <div className="min-h-screen" style={{ background: '#0D0D1A' }}>
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-heading font-black text-xl tracking-widest" style={{ color: '#BB5CF6', letterSpacing: '0.15em' }}>
          SYNAP
        </Link>
        <Link href="/dashboard" className="font-heading text-xs tracking-widest" style={{ color: '#475569' }}>
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: '#BB5CF6', letterSpacing: '0.2em' }}>UPGRADE</p>
          <h1 className="font-heading font-black text-4xl text-white tracking-wider mb-4" style={{ letterSpacing: '0.04em' }}>
            Unlock Your Full Potential
          </h1>
          <p className="font-heading text-base max-w-lg mx-auto" style={{ color: '#64748B' }}>
            7-day free trial. Cancel before day 7 and you&apos;ll never be charged — not even a single riyal.
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

        {/* Billing toggle */}
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
                SAVE {proSavings}%
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

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">

          {/* Free */}
          <div className="rounded-2xl p-6 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="mb-5">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-2" style={{ color: '#475569' }}>FREE</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-heading font-black text-4xl text-white">0</span>
              </div>
              <p className="font-heading text-xs" style={{ color: '#475569' }}>Forever free</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-6 flex-1">
              <Feature text="5 messages / day with Ion" />
              <Feature text="Personalised workout plan" />
              <Feature text="Personalised diet plan" />
              <Feature text="Workout tracker" />
              <Feature text="Progress tracking" />
              <FeatureMissing text="Unlimited plan regeneration" />
              <FeatureMissing text="Priority Ion responses" />
            </div>

            <Link href="/dashboard">
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#475569' }}>
                Current Plan
              </button>
            </Link>
          </div>

          {/* Pro — recommended */}
          <div className="rounded-2xl p-6 flex flex-col relative" style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(187,92,246,0.06))',
            border: '1px solid rgba(187,92,246,0.35)',
            boxShadow: '0 0 40px rgba(124,58,237,0.15)',
          }}>
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="font-heading font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full"
                style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.15em' }}>
                MOST POPULAR
              </span>
            </div>

            <div className="mb-5">
              <p className="font-heading font-black text-xs tracking-widest uppercase mb-2" style={{ color: '#BB5CF6' }}>PRO</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-heading font-black text-4xl text-white">
                  {rateLoading ? '...' : fmt(proPrice.sar)}
                </span>
                <span className="font-heading text-sm mb-1.5" style={{ color: '#64748B' }}>
                  /{billing === 'annual' ? 'year' : 'mo'}
                </span>
              </div>
              {billing === 'annual' && proMonthlyEq && (
                <p className="font-heading text-xs" style={{ color: '#A78BFA' }}>
                  ≈ {fmt(proMonthlyEq, 2)} / month · saves {proSavings}%
                </p>
              )}
              {billing === 'monthly' && (
                <p className="font-heading text-xs" style={{ color: '#475569' }}>
                  Switch to annual to save {proSavings}%
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-6 flex-1">
              <Feature text="30 messages / day with Ion" highlight />
              <Feature text="Everything in Free" />
              <Feature text="7-day free trial" />
              <Feature text="Unlimited plan regeneration" />
              <Feature text="Priority Ion responses" />
              <Feature text="Advanced progress analytics" />
              <FeatureMissing text="Unlimited daily messages" />
            </div>

            <button
              onClick={() => handleCheckout(proPrice.variantId, 'Pro')}
              disabled={!!loading}
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              style={{
                background: loading === proPrice.variantId ? 'rgba(187,92,246,0.5)' : '#BB5CF6',
                color: 'white',
                letterSpacing: '0.1em',
                boxShadow: '0 0 25px rgba(187,92,246,0.35)',
              }}
            >
              {loading === proPrice.variantId ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                  LOADING...
                </>
              ) : (
                <>START FREE TRIAL <ChevronRight size={14} /></>
              )}
            </button>
          </div>

          {/* Pro + Unlimited */}
          <div className="rounded-2xl p-6 flex flex-col" style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(124,58,237,0.06))',
            border: '1px solid rgba(34,211,238,0.2)',
          }}>
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-heading font-black text-xs tracking-widest uppercase" style={{ color: '#22D3EE' }}>PRO</p>
                <InfinityIcon size={14} style={{ color: '#22D3EE' }} />
                <p className="font-heading font-black text-xs tracking-widest uppercase" style={{ color: '#22D3EE' }}>UNLIMITED</p>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-heading font-black text-4xl text-white">
                  {rateLoading ? '...' : fmt(unlimPrice.sar)}
                </span>
                <span className="font-heading text-sm mb-1.5" style={{ color: '#64748B' }}>
                  /{billing === 'annual' ? 'year' : 'mo'}
                </span>
              </div>
              {billing === 'annual' && unlimMonthlyEq && (
                <p className="font-heading text-xs" style={{ color: '#22D3EE' }}>
                  ≈ {fmt(unlimMonthlyEq, 2)} / month · saves {unlimSavings}%
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mb-6 flex-1">
              <Feature text="Unlimited messages / day" highlight cyan />
              <Feature text="Everything in Pro" />
              <Feature text="7-day free trial" />
              <Feature text="No daily message cap, ever" />
              <Feature text="Ion always available" />
              <Feature text="Full conversation history" />
              <Feature text="First access to new features" />
            </div>

            <button
              onClick={() => handleCheckout(unlimPrice.variantId, 'Pro+Unlimited')}
              disabled={!!loading}
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2"
              style={{
                background: loading === unlimPrice.variantId ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.12)',
                border: '1px solid rgba(34,211,238,0.3)',
                color: loading === unlimPrice.variantId ? '#94A3B8' : '#22D3EE',
                letterSpacing: '0.1em',
              }}
            >
              {loading === unlimPrice.variantId ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#22D3EE', borderTopColor: 'transparent' }} />
                  LOADING...
                </>
              ) : (
                <>START FREE TRIAL <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>

        {/* Extra Chat Add-on */}
        <div className="rounded-2xl p-6 mb-12" style={{
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} style={{ color: '#F59E0B' }} />
                <p className="font-heading font-black text-sm tracking-wider text-white" style={{ letterSpacing: '0.08em' }}>EXTRA CHAT ADD-ON</p>
                <span className="font-heading text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>ONE-TIME</span>
              </div>
              <p className="font-heading text-sm" style={{ color: '#64748B' }}>
                +20 messages/day on top of your plan · {fmt(PRICES.extraChat.sar)} one-time purchase
              </p>
            </div>
            <button
              onClick={() => handleCheckout(PRICES.extraChat.variantId, 'Extra Chat')}
              disabled={!!loading}
              className="shrink-0 px-6 py-3 rounded-xl font-heading font-black text-xs tracking-wider transition-all"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#F59E0B',
                letterSpacing: '0.1em',
              }}
            >
              {loading === PRICES.extraChat.variantId ? 'LOADING...' : 'ADD TO PLAN +'}
            </button>
          </div>
        </div>

        {/* Trust signals */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <TrustCard
            icon={<Shield size={20} style={{ color: '#10B981' }} />}
            title="Zero-Charge Trial"
            desc="Cancel before day 7 and you will never be billed. Not a penny. Our guarantee."
          />
          <TrustCard
            icon={<Lock size={20} style={{ color: '#BB5CF6' }} />}
            title="Secure Payments"
            desc="Powered by Lemon Squeezy. All transactions encrypted. No card data stored on our servers."
          />
          <TrustCard
            icon={<Star size={20} style={{ color: '#F59E0B' }} />}
            title="Cancel Anytime"
            desc="No contracts, no cancellation fees. One click to cancel from Settings → Billing."
          />
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <p className="font-heading font-black text-sm text-white text-center mb-6 tracking-wider" style={{ letterSpacing: '0.1em' }}>
            FREQUENTLY ASKED QUESTIONS
          </p>
          <div className="flex flex-col gap-4">
            <FAQ q="Will I be charged if I cancel during the trial?" a="Absolutely not. If you cancel before day 7 of your trial, you will never be charged. Not now, not ever. You'll get a confirmation message from Ion the moment you cancel." />
            <FAQ q="What happens when my trial ends?" a="On day 7, your chosen plan activates and you're billed the full amount. You'll receive a reminder from Ion on days 5 and 6 so you have time to decide." />
            <FAQ q="Can I switch between plans?" a="Yes. You can upgrade or downgrade anytime from Settings → Billing. Changes take effect on your next billing cycle." />
            <FAQ q="Is SAR the only currency?" a="We automatically detect your local currency and show you a converted price. You can complete the checkout in your preferred currency." />
            <FAQ q="What payment methods are accepted?" a="All major credit and debit cards (Visa, Mastercard, Mada), Apple Pay, and local payment methods via Lemon Squeezy." />
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function Feature({ text, highlight = false, cyan = false }: { text: string; highlight?: boolean; cyan?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{ background: cyan ? 'rgba(34,211,238,0.15)' : 'rgba(187,92,246,0.15)' }}>
        <Check size={9} style={{ color: cyan ? '#22D3EE' : '#BB5CF6' }} />
      </div>
      <span className="font-heading text-xs" style={{ color: highlight ? 'white' : '#94A3B8', fontWeight: highlight ? '700' : '400' }}>
        {text}
      </span>
    </div>
  )
}

function FeatureMissing({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 opacity-30">
      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      <span className="font-heading text-xs line-through" style={{ color: '#475569' }}>{text}</span>
    </div>
  )
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
