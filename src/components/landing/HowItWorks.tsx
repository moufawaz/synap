'use client'

import { type Language, t } from '@/lib/i18n'
import { MessageSquare, LayoutDashboard, TrendingUp } from 'lucide-react'

interface HowItWorksProps {
  lang: Language
}

const steps = [
  {
    number: '01',
    icon: MessageSquare,
    color: 'violet',
    titleKey: 'how_step1_title' as const,
    descKey: 'how_step1_desc' as const,
    detail: {
      en: ['Name & age', 'Goals & timeline', 'Daily schedule', 'Food preferences', 'Training level'],
      ar: ['الاسم والعمر', 'الأهداف والجدول الزمني', 'الجدول اليومي', 'تفضيلات الطعام', 'مستوى التدريب'],
    },
  },
  {
    number: '02',
    icon: LayoutDashboard,
    color: 'cyan',
    titleKey: 'how_step2_title' as const,
    descKey: 'how_step2_desc' as const,
    detail: {
      en: ['Calorie & macro targets', 'Meal timing to your schedule', 'Exercise program + videos', '6-week progressive overload', 'Pre & post workout meals'],
      ar: ['أهداف السعرات والمغذيات', 'توقيت الوجبات حسب جدولك', 'برنامج التمارين + الفيديوهات', '6 أسابيع تحميل تدريجي', 'وجبات ما قبل وبعد التمرين'],
    },
  },
  {
    number: '03',
    icon: TrendingUp,
    color: 'violet',
    titleKey: 'how_step3_title' as const,
    descKey: 'how_step3_desc' as const,
    detail: {
      en: ['Morning check-ins', 'Meal logging in chat', 'Workout tracking', 'Plan renewal every cycle', 'Plateau detection & fix'],
      ar: ['متابعة صباحية', 'تسجيل الوجبات في المحادثة', 'تتبع التمارين', 'تجديد الخطة كل دورة', 'كشف الثبات وإصلاحه'],
    },
  },
]

export default function HowItWorks({ lang }: HowItWorksProps) {
  const isRTL = lang === 'ar'

  return (
    <section
      id="how-it-works"
      className="relative py-24 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      <div className="orb w-[500px] h-[400px] top-0 right-[-150px] bg-violet/8" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-center text-center'} gap-4 mb-16`}>
          <div className="section-label">
            <span>{t(lang, 'how_label')}</span>
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-light max-w-2xl">
            {t(lang, 'how_title')}
          </h2>
          <p className="text-light-muted text-lg max-w-xl">
            {t(lang, 'how_sub')}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet/30 to-transparent" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              const details = step.detail[lang as 'en' | 'ar'] || step.detail.en

              return (
                <div
                  key={step.number}
                  className="relative flex flex-col gap-6 animate-slide-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Step number + icon */}
                  <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-4`}>
                    <div
                      className={`
                        relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                        ${step.color === 'violet'
                          ? 'bg-violet/20 border border-violet/40 shadow-glow-sm'
                          : 'bg-cyan/10 border border-cyan/30'
                        }
                      `}
                    >
                      <Icon
                        size={24}
                        className={step.color === 'violet' ? 'text-violet' : 'text-cyan'}
                      />
                      {/* Step number badge */}
                      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-charcoal border border-white/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-light-muted">{index + 1}</span>
                      </div>
                    </div>
                    <span className="font-heading font-bold text-4xl text-white/5 leading-none select-none">
                      {step.number}
                    </span>
                  </div>

                  {/* Content card */}
                  <div className="glass-card-hover p-6 flex flex-col gap-4 flex-1">
                    <div>
                      <h3 className="font-heading font-semibold text-xl text-light mb-2">
                        {t(lang, step.titleKey)}
                      </h3>
                      <p className="text-light-muted text-sm leading-relaxed">
                        {t(lang, step.descKey)}
                      </p>
                    </div>

                    {/* Detail checklist */}
                    <ul className="flex flex-col gap-2">
                      {details.map((item) => (
                        <li key={item} className={`flex items-center gap-2 text-xs text-light-muted ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              step.color === 'violet' ? 'bg-violet' : 'bg-cyan'
                            }`}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
