'use client'

import { useState } from 'react'
import { ChevronRight, Info } from 'lucide-react'

interface StrengthCardProps {
  onSubmit: (data: Record<string, string>) => void
  lang: 'en' | 'ar'
}

interface Exercise {
  key: string
  name: string
  nameAr: string
  emoji: string
  tip: string
  tipAr: string
  placeholder: string   // example load
}

const EXERCISES: Exercise[] = [
  {
    key: 'squat_kg',
    name: 'Squat', nameAr: 'سكوات',
    emoji: '🏋️',
    tip: 'Enter the weight you can squat for ~5 solid reps (working set weight). If you only do Smith machine or leg press, note that below.',
    tipAr: 'أدخل الوزن الذي تسكوات به في ~5 تكرارات جيدة (وزن المجموعة العملية). إذا كنت تستخدم Smith أو leg press فقط، أشر إلى ذلك أدناه.',
    placeholder: 'e.g. 80',
  },
  {
    key: 'bench_kg',
    name: 'Bench Press', nameAr: 'بنش برس',
    emoji: '🤸',
    tip: 'Flat barbell bench press — weight you can do for ~5 reps with good form. Dumbbell? Use the per-hand weight × 2.',
    tipAr: 'بنش مستوي بالبار — وزن تستطيع رفعه في ~5 تكرارات بشكل صحيح. دمبلز؟ أدخل وزن يد واحدة × 2.',
    placeholder: 'e.g. 60',
  },
  {
    key: 'deadlift_kg',
    name: 'Deadlift', nameAr: 'ديدليفت',
    emoji: '⛏️',
    tip: 'Conventional or Romanian — the total weight on the bar you can pull for ~3–5 reps cleanly.',
    tipAr: 'تقليدي أو روماني — الوزن الإجمالي على البار الذي تستطيع شده في ~3–5 تكرارات بشكل نظيف.',
    placeholder: 'e.g. 100',
  },
  {
    key: 'ohp_kg',
    name: 'Overhead Press', nameAr: 'أوفرهيد برس',
    emoji: '🙌',
    tip: 'Standing barbell OHP for ~5 reps. Seated dumbbell? Use per-hand weight × 2.',
    tipAr: 'ضغط بار علوي وقوفاً في ~5 تكرارات. دمبلز جلوساً؟ أدخل وزن يد واحدة × 2.',
    placeholder: 'e.g. 40',
  },
  {
    key: 'row_kg',
    name: 'Barbell Row', nameAr: 'بنت أوفر رو',
    emoji: '🔗',
    tip: 'Bent-over barbell row for ~6–8 reps. Cable row or machine row? Enter the weight stack you use.',
    tipAr: 'رو بار منحنياً في ~6–8 تكرارات. كابل أو جهاز؟ أدخل وزن الكابل أو الجهاز.',
    placeholder: 'e.g. 70',
  },
  {
    key: 'pullup',
    name: 'Pull-up / Lat Pulldown', nameAr: 'عقلة / لات بولداون',
    emoji: '🧗',
    tip: 'Can you do pull-ups? Enter reps (e.g. "8 reps BW"). If not, enter your lat pulldown weight (e.g. "50 kg").',
    tipAr: 'هل تستطيع العقلة؟ أدخل التكرارات (مثلاً "8 تكرارات BW"). إذا لا، أدخل وزن لات بولداون (مثلاً "50 kg").',
    placeholder: 'e.g. 8 reps or 50 kg',
  },
  {
    key: 'leg_press_kg',
    name: 'Leg Press', nameAr: 'ليج برس',
    emoji: '🦵',
    tip: 'Total weight on the leg press machine you use for ~8–10 reps. Skip if you don\'t use it.',
    tipAr: 'الوزن الإجمالي على جهاز ليج برس الذي تستخدمه في ~8–10 تكرارات. اتركه إذا لا تستخدمه.',
    placeholder: 'e.g. 120',
  },
]

export default function StrengthCard({ onSubmit, lang }: StrengthCardProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [activeTooltip, setActiveTooltip] = useState<string | null>(EXERCISES[0].key)
  const isRTL = lang === 'ar'

  const activeTip = EXERCISES.find(e => e.key === activeTooltip)

  const filledCount = Object.values(values).filter(v => v.trim()).length

  function handleSkip() {
    onSubmit({ skipped: 'true' })
  }

  function handleSubmit() {
    onSubmit(Object.keys(values).length > 0 ? values : { skipped: 'true' })
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0E0E0E', border: '1px solid rgba(187,92,246,0.2)' }}>

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(187,92,246,0.08)', borderBottom: '1px solid rgba(187,92,246,0.15)' }}>
        <span className="font-heading font-bold text-xs tracking-widest uppercase" style={{ color: '#BB5CF6' }}>
          {isRTL ? '💪 مستوى قوتك الحالي' : '💪 Current Strength Levels'}
        </span>
        <span className="font-heading text-xs" style={{ color: '#64748B' }}>
          {isRTL ? 'اختياري' : 'Optional'}
        </span>
      </div>

      {/* Active tip */}
      {activeTip && (
        <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex gap-3" style={{ background: 'rgba(187,92,246,0.06)', border: '1px solid rgba(187,92,246,0.15)' }}>
          <Info size={13} style={{ color: '#BB5CF6', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="font-heading text-[10px] font-bold mb-0.5 uppercase tracking-wider" style={{ color: '#D88BFF' }}>
              {activeTip.emoji} {isRTL ? activeTip.nameAr : activeTip.name}
            </p>
            <p className="font-heading text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
              {isRTL ? activeTip.tipAr : activeTip.tip}
            </p>
          </div>
        </div>
      )}

      {/* Exercise inputs */}
      <div className="p-4 flex flex-col gap-2.5" dir={isRTL ? 'rtl' : 'ltr'}>
        {EXERCISES.map(ex => (
          <div key={ex.key}>
            <label className="font-heading text-[10px] font-semibold tracking-widest uppercase mb-1 block" style={{ color: '#475569' }}>
              {ex.emoji} {isRTL ? ex.nameAr : ex.name}
            </label>
            <div className="relative">
              <input
                type={ex.key === 'pullup' ? 'text' : 'number'}
                step="2.5"
                min="0"
                placeholder={ex.placeholder}
                value={values[ex.key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [ex.key]: e.target.value }))}
                onFocus={() => setActiveTooltip(ex.key)}
                className="w-full rounded-lg px-3 py-2 text-sm font-heading outline-none transition-all"
                style={{
                  background: '#080808',
                  border: `1px solid ${values[ex.key] ? 'rgba(187,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#E2E8F0',
                  paddingRight: ex.key === 'pullup' ? '12px' : '40px',
                }}
              />
              {ex.key !== 'pullup' && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-heading text-[10px]" style={{ color: '#475569' }}>
                  kg
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider transition-all duration-200"
          style={{
            background: filledCount > 0 ? '#BB5CF6' : 'rgba(187,92,246,0.15)',
            color: filledCount > 0 ? 'white' : '#BB5CF6',
            border: filledCount > 0 ? 'none' : '1px solid rgba(187,92,246,0.3)',
            boxShadow: filledCount > 0 ? '0 0 20px rgba(187,92,246,0.35)' : 'none',
            letterSpacing: '0.1em',
          }}
        >
          {filledCount > 0
            ? (isRTL ? `تأكيد (${filledCount} تمارين)` : `CONFIRM (${filledCount} exercise${filledCount > 1 ? 's' : ''})`)
            : (isRTL ? 'تأكيد' : 'CONFIRM')}
          <ChevronRight size={16} />
        </button>
        <button
          onClick={handleSkip}
          className="w-full py-2 rounded-xl font-heading text-xs font-semibold transition-all"
          style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {isRTL ? 'لست متأكداً / تخطى' : "Not sure yet / Skip"}
        </button>
      </div>
    </div>
  )
}
