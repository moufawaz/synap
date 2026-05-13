'use client'

import { type Language } from '@/lib/i18n'

interface Props { lang: Language }

const rows = [
  { en: 'Knows your body measurements',      ar: 'يعرف قياسات جسمك' },
  { en: 'Tracks your meals daily',           ar: 'يتتبع وجباتك يومياً' },
  { en: 'Remembers last month\'s progress',  ar: 'يتذكر تقدمك الشهر الماضي' },
  { en: 'Contacts you proactively',          ar: 'يتواصل معك باستباقية' },
  { en: 'Adapts your plan based on results', ar: 'يكيّف خطتك بناءً على نتائجك' },
  { en: 'Shows exercise videos',             ar: 'يعرض مقاطع تمارين' },
  { en: 'Tracks body symmetry',              ar: 'يتتبع تناسق الجسم' },
  { en: 'Food calories scanner',               ar: 'ماسح سعرات الطعام' },
  { en: 'Sends push notifications',          ar: 'يرسل إشعارات فورية' },
  { en: 'Built specifically for fitness',    ar: 'مبني خصيصاً للياقة البدنية' },
  { en: 'Remembers your full history',       ar: 'يتذكر تاريخك الكامل' },
  { en: 'Reaches out when you plateau',      ar: 'يتواصل عند توقف تقدمك' },
  { en: 'Feels like a real trainer',         ar: 'يشعرك بمدرب حقيقي' },
]

function CheckIcon() {
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full"
      style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.4)', boxShadow: '0 0 10px rgba(187,92,246,0.25)' }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="#BB5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function XIcon() {
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full"
      style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 2l6 6M8 2l-6 6" stroke="#334155" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function AIComparison({ lang }: Props) {
  const isRTL = lang === 'ar'

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(187,92,246,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(187,92,246,0.08)', border: '1px solid rgba(187,92,246,0.2)' }}>
            <span className="font-heading text-xs tracking-widest uppercase font-bold" style={{ color: '#BB5CF6' }}>
              {isRTL ? 'المقارنة' : 'A trainer that never clocks out'}
            </span>
          </div>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light mb-4">
            {isRTL
              ? 'قارن ما تحصل عليه'
              : 'Compare what you get with Ion'}
            <br />
            <span style={{ background: 'linear-gradient(90deg, #BB5CF6, #7B2FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isRTL ? 'مقابل البدائل الأخرى' : 'vs the alternatives'}
            </span>
          </h2>
          <p className="text-light-muted text-base max-w-xl mx-auto">
            {isRTL
              ? 'الذكاء الاصطناعي العام قوي. لكنه لم يُبنَ لهذا.'
              : "General AI answers questions. Ion trains people. There's a difference."}
          </p>
        </div>

        {/* Table card */}
        <div className="comparison-table rounded-2xl overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-3"
            style={{ borderBottom: '1px solid var(--comparison-border)' }}>
            {/* Capability label */}
            <div className="px-6 py-5">
              <span className="font-heading text-xs tracking-widest uppercase font-bold" style={{ color: '#334155' }}>
                {isRTL ? 'الميزة' : 'Capability'}
              </span>
            </div>

            {/* General AI header */}
            <div className="px-4 py-5 text-center"
              style={{ borderLeft: '1px solid var(--comparison-border)', borderRight: '1px solid var(--comparison-border)' }}>
              <p className="font-heading font-black text-xs tracking-widest uppercase" style={{ color: '#475569', letterSpacing: '0.12em' }}>
                {isRTL ? 'الذكاء الاصطناعي العام' : 'General AI'}
              </p>
              <p className="font-heading text-[10px] mt-1" style={{ color: '#1E293B' }}>
                ChatGPT / Gemini
              </p>
            </div>

            {/* Ion header — highlighted */}
            <div className="px-4 py-5 text-center relative"
              style={{ background: 'rgba(187,92,246,0.07)' }}>
              <div className="absolute top-0 inset-x-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, transparent, #BB5CF6, transparent)' }} />
              <p className="font-heading font-black text-xs tracking-widest uppercase"
                style={{ color: '#BB5CF6', letterSpacing: '0.12em' }}>
                SYNAP ION
              </p>
              <p className="font-heading text-[10px] mt-1" style={{ color: '#6D28D9' }}>
                {isRTL ? 'مدربك الذكي' : 'Your AI trainer'}
              </p>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1
            const isEven = i % 2 === 0
            return (
              <div key={i}
                className="grid grid-cols-3 group transition-colors duration-150"
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--comparison-border-soft)',
                  background: isEven ? 'transparent' : 'var(--comparison-row-alt)',
                }}>

                {/* Feature label */}
                <div className="px-6 py-3.5 flex items-center">
                  <span className="font-heading text-sm" style={{ color: '#64748B' }}>
                    {isRTL ? row.ar : row.en}
                  </span>
                </div>

                {/* General AI — always No */}
                <div className="px-4 py-3.5 flex items-center justify-center"
                  style={{ borderLeft: '1px solid var(--comparison-border-soft)', borderRight: '1px solid var(--comparison-border-soft)' }}>
                  <XIcon />
                </div>

                {/* Ion — always Yes */}
                <div className="comparison-ion-cell px-4 py-3.5 flex items-center justify-center">
                  <CheckIcon />
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom callout */}
        <div className="mt-10 p-6 rounded-2xl text-center"
          style={{ background: 'linear-gradient(135deg, rgba(187,92,246,0.1), rgba(123,47,255,0.06))', border: '1px solid rgba(187,92,246,0.2)' }}>
          <p className="font-heading font-black text-lg sm:text-xl mb-1" style={{ color: 'var(--silver)' }}>
            {isRTL
              ? 'الذكاء الاصطناعي العام يجيب على الأسئلة. آيون يدرّب الناس.'
              : 'General AI answers questions. Ion trains people.'}
          </p>
          <p className="font-heading text-sm" style={{ color: '#64748B' }}>
            {isRTL ? 'الفرق كبير.' : "That's the difference."}
          </p>
        </div>
      </div>
    </section>
  )
}
