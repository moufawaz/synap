'use client'

import { type Language } from '@/lib/i18n'
import { Star } from 'lucide-react'

interface Props { lang: Language }

const EN = {
  headline: 'What happens when Ion knows everything about you',
  testimonials: [
    {
      quote: "I've tried 6 fitness apps. Ion is the first one that felt like it was actually built for me. It knew I work until 8PM and built my meals around that.",
      name: 'Ahmed',
      location: 'Riyadh',
      result: 'Lost 8kg in 10 weeks',
    },
    {
      quote: "I told Ion I hate eggs and love kabsa. My meal plan actually has kabsa. I've never stuck to a diet this long in my life.",
      name: 'Sara',
      location: 'Jeddah',
      result: '12 weeks consistent',
    },
    {
      quote: "Ion caught that my left arm was 2cm smaller than my right. I didn't even know. It fixed my program the same day.",
      name: 'Khalid',
      location: 'Dubai',
      result: 'Building muscle',
    },
  ],
}

const AR = {
  headline: 'ماذا يحدث حين يعرف آيون كل شيء عنك',
  testimonials: [
    {
      quote: 'جربت 6 تطبيقات لياقة. آيون هو الأول الذي أشعر أنه مبني لي شخصياً. علم أنني أعمل حتى 8 مساءً وبنى وجباتي حول ذلك.',
      name: 'أحمد',
      location: 'الرياض',
      result: 'خسر 8 كجم في 10 أسابيع',
    },
    {
      quote: 'أخبرت آيون أنني أكره البيض وأحب الكبسة. خطتي الغذائية فيها كبسة فعلاً. لم ألتزم بأي نظام غذائي بهذا الشكل في حياتي.',
      name: 'سارة',
      location: 'جدة',
      result: '12 أسبوعاً متواصلة',
    },
    {
      quote: 'آيون اكتشف أن ذراعي اليسرى أصغر بـ 2 سم من اليمنى. لم أكن أعلم. صحّح برنامجي في نفس اليوم.',
      name: 'خالد',
      location: 'دبي',
      result: 'بناء عضلات',
    },
  ],
}

export default function SocialProof({ lang }: Props) {
  const isRTL = lang === 'ar'
  const copy = isRTL ? AR : EN

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[500px] h-[400px] bottom-0 left-1/2 -translate-x-1/2" style={{ background: 'rgba(187,92,246,0.06)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light">
            {copy.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.testimonials.map((t, i) => (
            <div key={i} className="glass-card p-8 flex flex-col gap-5">
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} size={14} fill="#BB5CF6" className="text-violet" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-light text-sm leading-relaxed flex-1">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between pt-4 border-t border-white/8">
                <div>
                  <p className="font-heading font-bold text-sm text-light">{t.name}</p>
                  <p className="font-heading text-xs text-light-muted">{t.location}</p>
                </div>
                <span className="font-heading text-xs font-bold tracking-wider px-3 py-1 rounded-full"
                  style={{ background: 'rgba(187,92,246,0.15)', color: '#BB5CF6', border: '1px solid rgba(187,92,246,0.25)' }}>
                  {t.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
