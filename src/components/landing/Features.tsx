'use client'

import { type Language, t } from '@/lib/i18n'
import {
  Utensils,
  Dumbbell,
  Ruler,
  Bell,
  RefreshCw,
  Languages,
} from 'lucide-react'

interface FeaturesProps {
  lang: Language
}

const features = [
  {
    icon: Utensils,
    titleKey: 'feat1_title' as const,
    descKey: 'feat1_desc' as const,
    accent: 'violet',
    badge: { en: '4-Week Cycle', ar: 'دورة 4 أسابيع' },
  },
  {
    icon: Dumbbell,
    titleKey: 'feat2_title' as const,
    descKey: 'feat2_desc' as const,
    accent: 'cyan',
    badge: { en: '6-Week Program', ar: 'برنامج 6 أسابيع' },
  },
  {
    icon: Ruler,
    titleKey: 'feat3_title' as const,
    descKey: 'feat3_desc' as const,
    accent: 'violet',
    badge: { en: '17 Measurements', ar: '17 قياساً' },
  },
  {
    icon: Bell,
    titleKey: 'feat4_title' as const,
    descKey: 'feat4_desc' as const,
    accent: 'cyan',
    badge: { en: 'Always On', ar: 'دائم التوفر' },
  },
  {
    icon: RefreshCw,
    titleKey: 'feat5_title' as const,
    descKey: 'feat5_desc' as const,
    accent: 'violet',
    badge: { en: 'Auto Renewal', ar: 'تجديد تلقائي' },
  },
  {
    icon: Languages,
    titleKey: 'feat6_title' as const,
    descKey: 'feat6_desc' as const,
    accent: 'cyan',
    badge: { en: 'AR + EN', ar: 'عربي + إنجليزي' },
  },
]

export default function Features({ lang }: FeaturesProps) {
  const isRTL = lang === 'ar'

  return (
    <section
      id="features"
      className="relative py-24 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background decoration */}
      <div className="orb w-[600px] h-[400px] bottom-0 left-[-200px] bg-cyan/5" />
      <div className="orb w-[400px] h-[400px] top-[10%] right-[-100px] bg-violet/8" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-center text-center'} gap-4 mb-16`}>
          <div className="section-label">
            <span>{t(lang, 'features_label')}</span>
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-light max-w-2xl">
            {t(lang, 'features_title')}
          </h2>
          <p className="text-light-muted text-lg max-w-xl">
            {t(lang, 'features_sub')}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const badge = feature.badge[lang as 'en' | 'ar'] || feature.badge.en

            return (
              <div
                key={index}
                className="glass-card-hover p-6 flex flex-col gap-4 group animate-slide-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {/* Icon + badge */}
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${feature.accent === 'violet'
                        ? 'bg-violet/15 border border-violet/30 group-hover:bg-violet/25 group-hover:shadow-glow-sm'
                        : 'bg-cyan/10 border border-cyan/20 group-hover:bg-cyan/20'
                      }
                      transition-all duration-300
                    `}
                  >
                    <Icon
                      size={22}
                      className={`${feature.accent === 'violet' ? 'text-violet' : 'text-cyan'} transition-transform group-hover:scale-110 duration-300`}
                    />
                  </div>
                  <span
                    className={`
                      text-[10px] font-semibold px-2.5 py-1 rounded-full
                      ${feature.accent === 'violet'
                        ? 'bg-violet/10 text-violet border border-violet/20'
                        : 'bg-cyan/10 text-cyan border border-cyan/20'
                      }
                    `}
                  >
                    {badge}
                  </span>
                </div>

                {/* Text */}
                <div>
                  <h3 className="font-heading font-semibold text-lg text-light mb-2">
                    {t(lang, feature.titleKey)}
                  </h3>
                  <p className="text-light-muted text-sm leading-relaxed">
                    {t(lang, feature.descKey)}
                  </p>
                </div>

                {/* Hover accent line */}
                <div
                  className={`
                    h-px w-0 group-hover:w-full transition-all duration-500 mt-auto
                    ${feature.accent === 'violet'
                      ? 'bg-gradient-to-r from-violet to-violet/0'
                      : 'bg-gradient-to-r from-cyan to-cyan/0'
                    }
                    ${isRTL ? 'bg-gradient-to-l' : ''}
                  `}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
