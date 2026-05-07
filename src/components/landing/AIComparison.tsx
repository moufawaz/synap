'use client'

import { type Language } from '@/lib/i18n'
import { Check, X } from 'lucide-react'

interface Props { lang: Language }

const rows = [
  { en: 'Knows your body measurements',        ar: 'يعرف قياسات جسمك' },
  { en: 'Tracks your meals daily',             ar: 'يتتبع وجباتك يومياً' },
  { en: 'Remembers last month\'s progress',    ar: 'يتذكر تقدمك الشهر الماضي' },
  { en: 'Contacts you proactively',            ar: 'يتواصل معك باستباقية' },
  { en: 'Adapts your plan based on results',   ar: 'يكيّف خطتك بناءً على نتائجك' },
  { en: 'Shows exercise videos',               ar: 'يعرض مقاطع تمارين' },
  { en: 'Tracks body symmetry',                ar: 'يتتبع تناسق الجسم' },
  { en: 'Scans food barcodes',                 ar: 'يمسح بارکود الطعام' },
  { en: 'Sends push notifications',            ar: 'يرسل إشعارات فورية' },
  { en: 'Built specifically for fitness',      ar: 'مبني خصيصاً للياقة البدنية' },
  { en: 'Remembers your full history',         ar: 'يتذكر تاريخك الكامل' },
  { en: 'Reaches out when you plateau',        ar: 'يتواصل عند توقف تقدمك' },
  { en: 'Feels like a real trainer',           ar: 'يشعرك بمدرب حقيقي' },
]

export default function AIComparison({ lang }: Props) {
  const isRTL = lang === 'ar'

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[500px] h-[500px] top-0 right-0" style={{ background: 'rgba(187,92,246,0.07)' }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-4">
          <span className="font-heading text-xs tracking-widest uppercase text-violet/80">
            {isRTL ? 'المقارنة' : 'The Difference'}
          </span>
        </div>
        <div className="text-center mb-6">
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light">
            {isRTL ? 'لماذا الذكاء الاصطناعي العام لا يستطيع تدريبك' : "Why general AI can't train you"}
          </h2>
        </div>
        <p className="text-center text-light-muted text-lg mb-12 max-w-2xl mx-auto">
          {isRTL
            ? 'الذكاء الاصطناعي العام قوي. لكنه لم يُبنَ لهذا.'
            : "General AI is powerful. But it wasn't built for this."}
        </p>

        {/* Comparison table */}
        <div className="glass-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-3 border-b border-white/8"
            style={{ background: 'rgba(187,92,246,0.08)' }}>
            <div className="px-6 py-4 font-heading font-bold text-sm text-light-muted uppercase tracking-widest">
              {isRTL ? 'الميزة' : 'Capability'}
            </div>
            <div className="px-6 py-4 font-heading font-bold text-sm text-light-muted uppercase tracking-widest text-center">
              {isRTL ? 'الذكاء الاصطناعي العام' : 'General AI'}
            </div>
            <div className="px-6 py-4 font-heading font-bold text-sm uppercase tracking-widest text-center"
              style={{ color: '#BB5CF6' }}>
              SYNAP ION
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div key={i}
              className="grid grid-cols-3 border-b border-white/5 transition-colors hover:bg-white/2"
              style={{ borderColor: i === rows.length - 1 ? 'transparent' : undefined }}>
              <div className="px-6 py-3.5 font-heading text-sm text-light-muted">
                {isRTL ? row.ar : row.en}
              </div>
              <div className="px-6 py-3.5 flex justify-center items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <X size={12} style={{ color: '#FCA5A5' }} />
                </div>
              </div>
              <div className="px-6 py-3.5 flex justify-center items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <Check size={12} style={{ color: '#86EFAC' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div className="mt-12 text-center flex flex-col gap-3">
          <p className="font-heading font-bold text-xl sm:text-2xl text-light">
            {isRTL
              ? 'الذكاء الاصطناعي العام يجيب على الأسئلة. آيون يدرّب الناس. الفرق كبير.'
              : "General AI answers questions. Ion trains people. There's a difference."}
          </p>
        </div>
      </div>
    </section>
  )
}
