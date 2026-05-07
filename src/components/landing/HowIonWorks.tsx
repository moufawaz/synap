'use client'

import { type Language } from '@/lib/i18n'
import { MessageCircle, Zap, RefreshCw } from 'lucide-react'

interface Props { lang: Language }

const EN = {
  label: 'How It Works',
  headline: 'How Ion works',
  steps: [
    {
      icon: MessageCircle,
      number: '01',
      title: 'Tell Ion everything',
      body: 'Ion asks you questions — your body, your schedule, your food, your goals, your life. Not a form. A real conversation.',
    },
    {
      icon: Zap,
      number: '02',
      title: 'Ion builds your complete plan',
      body: 'Diet timed to your exact day. Workouts matched to gym or home. Every meal from food you actually enjoy. Every exercise with a tutorial video. Built in under 5 minutes. Built for nobody else.',
    },
    {
      icon: RefreshCw,
      number: '03',
      title: 'Ion follows you — not the other way around',
      body: 'Ion checks in every morning. Logs your meals. Adjusts when life happens. Rebuilds your plan every cycle based on your actual results. Catches plateaus. Fixes imbalances.',
    },
  ],
}

const AR = {
  label: 'كيف يعمل',
  headline: 'كيف يعمل آيون',
  steps: [
    {
      icon: MessageCircle,
      number: '01',
      title: 'أخبر آيون بكل شيء',
      body: 'آيون يسألك أسئلة — عن جسمك، جدولك، طعامك، أهدافك، حياتك. ليس استمارة. محادثة حقيقية.',
    },
    {
      icon: Zap,
      number: '02',
      title: 'آيون يبني خطتك الكاملة',
      body: 'نظام غذائي موقّت بدقة ليومك. تمارين مناسبة للصالة أو المنزل. كل وجبة من طعام تحبه فعلاً. كل تمرين مع فيديو توضيحي. مبني في أقل من 5 دقائق. مبني لك وحدك.',
    },
    {
      icon: RefreshCw,
      number: '03',
      title: 'آيون يتابعك — لا العكس',
      body: 'آيون يراجعك كل صباح. يسجل وجباتك. يتكيف حين تتغير الظروف. يعيد بناء خطتك كل دورة بناءً على نتائجك الفعلية. يكتشف التوقف. يصحح الاختلالات.',
    },
  ],
}

export default function HowIonWorks({ lang }: Props) {
  const isRTL = lang === 'ar'
  const copy = isRTL ? AR : EN

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[500px] h-[400px] bottom-0 left-[-100px]" style={{ background: 'rgba(187,92,246,0.07)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="font-heading text-xs tracking-widest uppercase text-violet/80 mb-4 block">
            {copy.label}
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light">
            {copy.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(187,92,246,0.3), transparent)' }} />

          {copy.steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="glass-card p-8 flex flex-col gap-5 relative">
                {/* Step number */}
                <div className="font-heading font-black text-5xl"
                  style={{ color: 'rgba(187,92,246,0.15)', lineHeight: 1 }}>
                  {step.number}
                </div>

                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.3)' }}>
                  <Icon size={22} className="text-violet" />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-heading font-bold text-lg text-light">{step.title}</h3>
                  <p className="text-light-muted text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
