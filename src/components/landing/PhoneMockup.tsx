'use client'

import { type Language } from '@/lib/i18n'

/**
 * CSS-only iPhone frame with a miniature SYNAP dashboard inside — no image
 * assets, crisp at every size, bilingual. Used in the Hero and final CTA.
 */
export default function PhoneMockup({ lang, className = '' }: { lang: Language; className?: string }) {
  const ar = lang === 'ar'
  return (
    <div className={`relative ${className}`} dir={ar ? 'rtl' : 'ltr'} aria-hidden>
      {/* Glow */}
      <div className="absolute inset-0 blur-3xl scale-110 rounded-[3rem]" style={{ background: 'rgba(187,92,246,0.22)' }} />

      {/* Frame */}
      <div
        className="relative mx-auto rounded-[2.6rem] p-[10px]"
        style={{
          width: 270,
          background: 'linear-gradient(160deg, #2A2A30, #131316)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2.1rem]" style={{ background: '#050507', height: 560 }}>
          {/* Dynamic island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[88px] h-[24px] rounded-full z-10" style={{ background: '#000' }} />

          <div className="px-4 pt-12 pb-4 flex flex-col gap-3 h-full">
            {/* Greeting */}
            <div>
              <p className="text-[9px] font-heading tracking-[0.2em] uppercase" style={{ color: '#BB5CF6' }}>SYNAP</p>
              <p className="text-white font-heading font-black text-[17px] leading-tight">
                {ar ? 'صباح الخير، أحمد' : 'Good morning, Ahmed'}
              </p>
            </div>

            {/* Calories ring card */}
            <div className="rounded-2xl p-3.5 flex items-center gap-3.5" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="relative w-[64px] h-[64px] shrink-0">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(187,92,246,0.15)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#BB5CF6" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 27}`} strokeDashoffset={`${2 * Math.PI * 27 * 0.36}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white font-heading font-black text-[13px]">64%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-silver-muted">{ar ? 'سعرات اليوم' : "Today's calories"}</p>
                <p className="text-white font-heading font-bold text-[15px]">1,408 <span className="text-silver-muted text-[10px] font-normal">/ 2,200</span></p>
                <p className="text-[9.5px] mt-0.5" style={{ color: '#22C55E' }}>{ar ? 'بروتين 96غ ✓' : 'Protein 96g ✓'}</p>
              </div>
            </div>

            {/* Today's workout */}
            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(187,92,246,0.10)', border: '1px solid rgba(187,92,246,0.25)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: '#D88BFF' }}>
                  {ar ? 'تمرين اليوم' : "TODAY'S SESSION"}
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-heading font-bold" style={{ background: '#BB5CF6', color: '#fff' }}>6:00 PM</span>
              </div>
              <p className="text-white font-heading font-black text-[15px] mt-1">{ar ? 'دفع — صدر وأكتاف' : 'Push — Chest & Shoulders'}</p>
              <p className="text-[10px] text-silver-muted mt-0.5">{ar ? '6 تمارين · 55 دقيقة' : '6 exercises · 55 min'}</p>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: '33%', background: 'linear-gradient(90deg,#BB5CF6,#7B2FFF)' }} />
              </div>
            </div>

            {/* Ion message */}
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#BB5CF6,#7B2FFF)' }}>
                  <span className="text-[8px] text-white font-black">AI</span>
                </div>
                <p className="text-[10px] font-heading font-bold tracking-widest text-white">ION</p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#C9CFD8' }}>
                {ar
                  ? 'نومك تحسّن هذا الأسبوع — زدت أوزان السكوات 2.5 كغ في خطة اليوم. جاهز؟ 💪'
                  : 'Your sleep improved this week — I bumped your squat load +2.5 kg for today. Ready? 💪'}
              </p>
            </div>

            {/* Water */}
            <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] text-silver-muted">{ar ? 'الماء' : 'Hydration'}</p>
              <div className="flex gap-1">
                {[1, 1, 1, 1, 0, 0].map((f, i) => (
                  <div key={i} className="w-3 h-5 rounded-sm" style={{ background: f ? 'linear-gradient(180deg,#38BDF8,#0284C7)' : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
            </div>

            {/* Tab bar */}
            <div className="mt-auto rounded-2xl px-4 py-2.5 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(ar ? ['الرئيسية', 'تمرين', 'تغذية', 'آيون'] : ['Home', 'Train', 'Fuel', 'Ion']).map((label, i) => (
                <span key={label} className="text-[8.5px] font-heading tracking-wider" style={{ color: i === 0 ? '#BB5CF6' : 'rgba(255,255,255,0.35)' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
