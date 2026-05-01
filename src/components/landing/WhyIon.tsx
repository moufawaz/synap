'use client'

import { type Language, t } from '@/lib/i18n'
import { Check, X, Minus } from 'lucide-react'

interface WhyIonProps {
  lang: Language
}

type CellValue = 'yes' | 'no' | 'partial' | string

const comparisonRows = [
  { key: 'row1' as const, ion: 'yes', human: 'yes', app: 'partial' },
  { key: 'row2' as const, ion: 'yes', human: 'partial', app: 'no' },
  { key: 'row3' as const, ion: 'yes', human: 'partial', app: 'no' },
  { key: 'row4' as const, ion: 'yes', human: 'partial', app: 'no' },
  { key: 'row5' as const, ion: 'yes', human: 'no', app: 'yes' },
  { key: 'row6' as const, ion: 'yes', human: 'partial', app: 'no' },
  { key: 'row7' as const, ion: 'row7_ion', human: 'row7_human', app: 'row7_app' },
]

import { translations } from '@/lib/i18n'
type TranslationKey = keyof typeof translations['en']

function Cell({ value, lang }: { value: CellValue; lang: Language }) {
  if (value === 'yes') {
    return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-violet/20 border border-violet/40 flex items-center justify-center">
          <Check size={12} className="text-violet" />
        </div>
      </div>
    )
  }
  if (value === 'no') {
    return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <X size={12} className="text-light-muted/50" />
        </div>
      </div>
    )
  }
  if (value === 'partial') {
    return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center">
          <Minus size={12} className="text-cyan/70" />
        </div>
      </div>
    )
  }
  // String value — render translated text
  return (
    <div className="flex justify-center">
      <span className="text-sm font-semibold text-light">
        {t(lang, value as TranslationKey)}
      </span>
    </div>
  )
}

export default function WhyIon({ lang }: WhyIonProps) {
  const isRTL = lang === 'ar'

  return (
    <section
      className="relative py-24 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="orb w-[500px] h-[400px] top-0 left-1/2 -translate-x-1/2 bg-violet/6" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-center text-center'} gap-4 mb-16`}>
          <div className="section-label">
            <span>{t(lang, 'why_label')}</span>
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-light max-w-2xl">
            {t(lang, 'why_title')}
          </h2>
          <p className="text-light-muted text-lg max-w-xl">
            {t(lang, 'why_sub')}
          </p>
        </div>

        {/* Comparison table */}
        <div className="glass-card overflow-hidden max-w-3xl mx-auto">
          {/* Table header */}
          <div className="grid grid-cols-4 border-b border-white/5">
            <div className="px-6 py-4">
              <span className="text-light-muted text-xs font-semibold uppercase tracking-wider">
                {t(lang, 'col_feature')}
              </span>
            </div>
            {/* Ion header — highlighted */}
            <div className="px-4 py-4 bg-violet/10 border-x border-violet/20 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-violet/20 border border-violet/40 flex items-center justify-center">
                <span className="text-violet font-bold text-sm">⚡</span>
              </div>
              <span className="text-violet font-bold text-sm">{t(lang, 'col_ion')}</span>
            </div>
            <div className="px-4 py-4 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <span className="text-light-muted text-xs font-medium text-center">{t(lang, 'col_human')}</span>
            </div>
            <div className="px-4 py-4 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-sm">📱</span>
              </div>
              <span className="text-light-muted text-xs font-medium text-center">{t(lang, 'col_app')}</span>
            </div>
          </div>

          {/* Table rows */}
          {comparisonRows.map((row, index) => (
            <div
              key={row.key}
              className={`
                grid grid-cols-4 border-b border-white/5 last:border-b-0
                ${index % 2 === 0 ? 'bg-white/[0.01]' : ''}
                hover:bg-white/[0.03] transition-colors duration-150
              `}
            >
              <div className="px-6 py-4 flex items-center">
                <span className="text-light text-sm">{t(lang, row.key)}</span>
              </div>
              {/* Ion cell — highlighted */}
              <div className="px-4 py-4 bg-violet/5 border-x border-violet/10 flex items-center justify-center">
                <Cell value={row.ion} lang={lang} />
              </div>
              <div className="px-4 py-4 flex items-center justify-center">
                <Cell value={row.human} lang={lang} />
              </div>
              <div className="px-4 py-4 flex items-center justify-center">
                <Cell value={row.app} lang={lang} />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className={`flex items-center justify-center gap-6 mt-6`}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-violet/20 border border-violet/40 flex items-center justify-center">
              <Check size={8} className="text-violet" />
            </div>
            <span className="text-light-muted text-xs">{isRTL ? 'نعم' : 'Yes'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <Minus size={8} className="text-cyan/70" />
            </div>
            <span className="text-light-muted text-xs">{isRTL ? 'جزئياً' : 'Partial'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <X size={8} className="text-light-muted/50" />
            </div>
            <span className="text-light-muted text-xs">{isRTL ? 'لا' : 'No'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
