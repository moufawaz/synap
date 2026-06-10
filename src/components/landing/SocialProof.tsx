'use client'

import { type Language } from '@/lib/i18n'
import Reveal from '@/components/landing/Reveal'

interface Props { lang: Language }

/**
 * Honest proof section — product truths instead of fabricated testimonials.
 * (Real user quotes can replace/extend this after launch.)
 */
export default function SocialProof({ lang }: Props) {
  const ar = lang === 'ar'

  const copy = ar
    ? {
        label: 'لماذا سناب مختلف',
        headline: 'مبني على الحقيقة، لا على القوالب',
        stats: [
          { value: '8 دقائق', caption: 'من التسجيل إلى خطة كاملة مخصصة — تمرين وتغذية' },
          { value: '42 يوماً', caption: 'دورة تمرين متدرجة تُعاد صياغتها حول نتائجك الفعلية' },
          { value: '34+', caption: 'طبقاً خليجياً ومصرياً وشامياً يعرفها آيون بمقادير حقيقية' },
          { value: '2', caption: 'لغتان كاملتان — عربي وإنجليزي، حتى في الإشعارات' },
        ],
        foot: 'انطلقنا للتو — كن من الأعضاء المؤسسين وشارك في تشكيل المنتج.',
      }
    : {
        label: 'WHY SYNAP IS DIFFERENT',
        headline: 'Built on truth, not templates',
        stats: [
          { value: '8 min', caption: 'from signup to a complete personalized training + nutrition plan' },
          { value: '42 days', caption: 'progressive training cycles rebuilt around your actual results' },
          { value: '34+', caption: 'Gulf, Egyptian & Levantine dishes Ion knows with real portions' },
          { value: '2', caption: 'full languages — Arabic and English, down to the notifications' },
        ],
        foot: 'We just launched — join as a founding member and help shape the product.',
      }

  return (
    <section className="relative py-24" dir={ar ? 'rtl' : 'ltr'}>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <div className="section-label mb-4 inline-flex">{copy.label}</div>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-white" style={{ letterSpacing: '0.04em' }}>
            {copy.headline}
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {copy.stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.07}>
              <div
                className="rounded-3xl p-6 text-center h-full transition-transform duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p
                  className="font-heading font-black text-3xl sm:text-4xl mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #D88BFF, #BB5CF6)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {s.value}
                </p>
                <p className="text-silver-muted text-[13px] leading-relaxed">{s.caption}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="text-center text-silver-muted/70 text-sm mt-10 font-heading tracking-wide">{copy.foot}</p>
        </Reveal>
      </div>
    </section>
  )
}
