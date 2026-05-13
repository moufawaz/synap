'use client'

import Link from 'next/link'
import { Zap, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  daysLeft: number       // 0 = last day, -1 = expired
  isFreeTrial: boolean   // true = free signup trial, false = paid LS trial
  lang: 'en' | 'ar'
}

export default function TrialBanner({ daysLeft, isFreeTrial, lang }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const isRTL = lang === 'ar'
  const expired = daysLeft < 0 || daysLeft === 0 && isFreeTrial
  // Only show for free trial (paid LS trial has its own billing flow)
  if (!isFreeTrial) return null

  const copy = isRTL
    ? {
        trialActive: `تجربتك المجانية · ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} متبقية`,
        trialExpired: 'انتهت تجربتك المجانية',
        upgradeCta: 'ترقية للاستمرار',
        activeSub: 'استمتع بوصول كامل — سينتهي بعد انتهاء الفترة',
      }
    : {
        trialActive: `Full access trial · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`,
        trialExpired: 'Your free trial has ended',
        upgradeCta: 'Upgrade to keep access',
        activeSub: 'Full access active — reverts to Starter when trial ends',
      }

  if (expired) {
    return (
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-3"
        style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}
        dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 min-w-0">
          <Zap size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
          <span className="font-heading text-xs font-semibold" style={{ color: '#EF4444' }}>
            {copy.trialExpired}
          </span>
        </div>
        <Link href="/pricing"
          className="font-heading text-xs font-black tracking-wider px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
          style={{ background: '#EF4444', color: 'white', letterSpacing: '0.08em' }}>
          {copy.upgradeCta}
        </Link>
      </div>
    )
  }

  const urgency = daysLeft <= 2
  const color = urgency ? '#F59E0B' : '#BB5CF6'

  return (
    <div className="w-full px-4 py-2.5 flex items-center justify-between gap-3"
      style={{ background: `${color}0d`, borderBottom: `1px solid ${color}30` }}
      dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 min-w-0">
        <Zap size={13} style={{ color, flexShrink: 0 }} />
        <span className="font-heading text-xs font-semibold" style={{ color }}>
          {copy.trialActive}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/pricing"
          className="font-heading text-xs font-black tracking-wider px-3 py-1.5 rounded-lg transition-all"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40`, letterSpacing: '0.08em' }}>
          {copy.upgradeCta}
        </Link>
        <button onClick={() => setDismissed(true)} style={{ color: '#475569' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
