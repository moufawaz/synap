'use client'

import { X, Zap, Crown, Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PRICING } from '@/lib/pricing'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  /** Which feature triggered this — shown as context above the plans */
  featureName?: string
  /** If the user is already Pro, highlight Elite upgrade path */
  currentPlan?: 'starter' | 'pro' | 'elite'
}

const PRO_FEATURES = [
  'Unlimited Ion messages',
  'Full diet & workout plans',
  'Nutrition logging & barcode scanner',
  'Progress photos & body measurements',
  'Workout tracking & logging',
  'Goal timeline prediction',
]

const ELITE_FEATURES = [
  'Everything in Pro',
  'Weekly body composition reports',
  'Ion supplement recommendations',
  'Priority support',
  'Early access to new features',
]

export default function UpgradeModal({ isOpen, onClose, featureName, currentPlan = 'starter' }: UpgradeModalProps) {
  if (!isOpen) return null

  const isPro = currentPlan === 'pro'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.2)', boxShadow: '0 0 60px rgba(187,92,246,0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <p className="font-heading text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#BB5CF6', letterSpacing: '0.18em' }}>
              {isPro ? 'UNLOCK ELITE' : 'UPGRADE YOUR PLAN'}
            </p>
            <h2 className="font-heading font-black text-xl text-white tracking-wide">
              {featureName
                ? `${featureName} is ${isPro ? 'Elite' : 'Pro+'}`
                : isPro ? 'Go Elite' : 'Choose your plan'}
            </h2>
            {featureName && (
              <p className="font-heading text-xs mt-1" style={{ color: '#64748B' }}>
                Upgrade to unlock this and more
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#475569' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">

          {/* Pro card — show prominently if user is Starter */}
          {!isPro && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.2)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: '#BB5CF6' }} />
                  <p className="font-heading font-black text-base text-white tracking-wide">Pro</p>
                </div>
                <div className="text-right">
                  <span className="font-heading font-black text-xl text-white">{PRICING.pro.monthly.sar}</span>
                  <span className="font-heading text-xs ml-1" style={{ color: '#64748B' }}>SAR/mo</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {PRO_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check size={12} style={{ color: '#BB5CF6', flexShrink: 0 }} />
                    <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" onClick={onClose}>
                <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.06em', boxShadow: '0 0 20px rgba(187,92,246,0.3)' }}>
                  Get Pro <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          )}

          {/* Elite card — highlighted when Pro or showing both */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: isPro ? 'rgba(187,92,246,0.08)' : 'rgba(123,47,255,0.06)',
              border: `1px solid ${isPro ? 'rgba(187,92,246,0.3)' : 'rgba(187,92,246,0.15)'}`,
              boxShadow: isPro ? '0 0 30px rgba(187,92,246,0.12)' : undefined,
            }}
          >
            {/* Best value badge */}
            <div
              className="absolute top-3 right-3 font-heading font-black text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: '#BB5CF6', color: 'white', letterSpacing: '0.12em' }}
            >
              ⭐ BEST VALUE
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown size={16} style={{ color: '#D88BFF' }} />
                <p className="font-heading font-black text-base text-white tracking-wide">Elite</p>
              </div>
              <div className="text-right">
                <span className="font-heading font-black text-xl text-white">{PRICING.elite.monthly.sar}</span>
                <span className="font-heading text-xs ml-1" style={{ color: '#64748B' }}>SAR/mo</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {ELITE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={12} style={{ color: '#D88BFF', flexShrink: 0 }} />
                  <span className="font-heading text-xs" style={{ color: '#94A3B8' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/pricing" onClick={onClose}>
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #BB5CF6, #7B2FFF)',
                  color: 'white',
                  letterSpacing: '0.06em',
                  boxShadow: '0 0 24px rgba(187,92,246,0.35)',
                }}>
                {isPro ? 'Upgrade to Elite' : 'Get Elite'} <ChevronRight size={14} />
              </button>
            </Link>
          </div>

          {/* View full pricing link */}
          <Link href="/pricing" onClick={onClose} className="text-center">
            <p className="font-heading text-xs" style={{ color: '#475569' }}>
              View full plan comparison →
            </p>
          </Link>

        </div>
      </div>
    </div>
  )
}
