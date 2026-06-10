'use client'

import { type Language } from '@/lib/i18n'
import Reveal from '@/components/landing/Reveal'
import { Bell, Camera, Dumbbell, MessageCircle, ScanLine, Utensils } from 'lucide-react'

interface Props { lang: Language }

/**
 * Premium bento features grid: six hero cells with mini-visuals + a chip cloud
 * for the long tail (replaces the old 20-card wall).
 */
export default function FeaturesGrid({ lang }: Props) {
  const ar = lang === 'ar'

  const copy = ar
    ? {
        label: 'كل ما يفعله آيون',
        headline: 'مدرّب كامل. ليس مجرد تطبيق.',
        sub: 'كل ميزة تغذّي الأخرى — تمرينك يعرف نومك، وغذاؤك يعرف تمرينك.',
        cells: {
          chat: { title: 'مدرّب يردّ عليك فعلاً', body: 'اسأل، عدّل خطتك، سجّل وجباتك بالكلام العادي — "أكلت كشري" — وآيون يتولى الحسابات ويحدّث الخطة فوراً.' },
          food: { title: 'يعرف أكلك المحلي', body: 'كبسة، مندي، كشري، فول، ملوخية — بمقادير حقيقية وليس تقديرات غربية. خططك مبنية حول أكلك الفعلي.' },
          plans: { title: 'برامج تمرين متطورة', body: 'برنامج 6 أسابيع متدرج، جيم أو منزل، فيديو لكل تمرين، ويزداد صعوبة كلما قويت.' },
          scan: { title: 'يقرأ تحليل InBody', body: 'صوّر تحليلك وآيون يستخرج دهونك وعضلاتك وBMR الفعلي — أهداف دقيقة وليست تخمينات.' },
          camera: { title: 'مسح الطعام بالكاميرا', body: 'وجّه الكاميرا لأي منتج أو طبق — حتى الأطباق المحلية — وتُسجَّل السعرات فوراً.' },
          proactive: { title: 'يتابعك قبل أن تطلب', body: 'رسائل الصباح، تذكير الماء والوجبات والتمرين، وتنبيه عند ثبات الوزن — مدرّب يبدأ الحديث.' },
        },
        moreLabel: 'وأكثر من ذلك',
        more: ['دليل الأكل بالخارج', 'قائمة تسوق أسبوعية', 'فحص الأداء بالذكاء الاصطناعي', 'تتبع 13 قياساً للجسم', 'ضبط ماكروز تلقائي ⭐', 'توصيات مكملات ⭐', 'تقرير أسبوعي ⭐', 'توقع موعد هدفك ⭐', 'مهمة أسبوعية', 'بطاقة تقدم للمشاركة', 'مدرب التماثل العضلي', 'تكامل Apple Health'],
      }
    : {
        label: 'EVERYTHING ION DOES',
        headline: 'A full coach. Not just an app.',
        sub: 'Every feature feeds the next — your training knows your sleep, your food knows your training.',
        cells: {
          chat: { title: 'A coach that answers back', body: 'Ask anything, edit your plan, log meals in plain words — "I had koshary" — and Ion does the math and updates your plan instantly.' },
          food: { title: 'Knows your local food', body: 'Kabsa, mandi, koshary, ful, molokhia — with real local portions, not Western guesses. Plans built around what you actually eat.' },
          plans: { title: 'Progressive training programs', body: '6-week periodized programs, gym or home, video for every exercise — and it gets harder as you get stronger.' },
          scan: { title: 'Reads your InBody scan', body: 'Photograph your scan and Ion extracts your real body fat, muscle mass, and BMR — exact targets, not population guesses.' },
          camera: { title: 'Point-and-scan food logging', body: 'Aim your camera at any product or plate — local dishes included — and the macros are logged instantly.' },
          proactive: { title: 'Reaches out before you ask', body: 'Morning briefs, water, meal and training reminders, plateau alerts — a coach that starts the conversation.' },
        },
        moreLabel: 'AND MORE',
        more: ['Eating-out guide', 'Weekly grocery builder', 'AI form check', '13 body measurements', 'Auto macro-tuning ⭐', 'Supplement protocols ⭐', 'Weekly report ⭐', 'Goal timeline prediction ⭐', 'Weekly mission', 'Progress share card', 'Symmetry coach', 'Apple Health sync'],
      }

  const cellBase = 'relative rounded-3xl p-6 overflow-hidden transition-transform duration-300 hover:-translate-y-1'
  const cellStyle = { background: 'var(--silver-faint)', border: '1px solid var(--silver-rim)' }
  const cellStyleSpark = { background: 'linear-gradient(150deg, rgba(187,92,246,0.16), rgba(123,47,255,0.06))', border: '1px solid rgba(187,92,246,0.3)' }

  return (
    <section className="relative py-24 sm:py-32" dir={ar ? 'rtl' : 'ltr'}>
      <div className="orb w-[500px] h-[500px] top-[10%] right-[-150px]" style={{ background: 'rgba(187,92,246,0.06)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className={`mb-14 ${ar ? 'text-right' : 'text-left'}`}>
          <div className="section-label mb-4 inline-flex">{copy.label}</div>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--silver)', letterSpacing: '0.04em' }}>
            {copy.headline}
          </h2>
          <p className="text-silver-muted mt-4 max-w-xl text-base sm:text-lg">{copy.sub}</p>
        </Reveal>

        {/* Bento */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Ion chat — large */}
          <Reveal className="md:col-span-4">
            <div className={cellBase} style={cellStyleSpark}>
              <div className="flex items-center gap-2.5 mb-3">
                <MessageCircle size={18} style={{ color: '#D88BFF' }} />
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.chat.title}</h3>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed max-w-md">{copy.cells.chat.body}</p>
              {/* mini chat visual */}
              <div className="mt-5 flex flex-col gap-2 max-w-sm">
                <div className="self-end px-3.5 py-2 rounded-2xl text-[12px]" style={{ background: 'var(--silver-faint)', border: '1px solid var(--silver-rim)', color: 'var(--silver)' }}>
                  {ar ? 'خلّي الخميس راحة' : 'Make Thursday a rest day'}
                </div>
                <div className="self-start px-3.5 py-2 rounded-2xl text-[12px]" style={{ background: 'rgba(187,92,246,0.18)', border: '1px solid rgba(187,92,246,0.3)', color: 'var(--silver)' }}>
                  {ar ? 'تم ✓ — حدّثت خطتك وتذكيراتك.' : 'Done ✓ — your plan and reminders are updated.'}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Local food — tall accent */}
          <Reveal delay={0.08} className="md:col-span-2">
            <div className={`${cellBase} h-full`} style={cellStyle}>
              <div className="flex items-center gap-2.5 mb-3">
                <Utensils size={18} style={{ color: '#D88BFF' }} />
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.food.title}</h3>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed">{copy.cells.food.body}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(ar ? ['كبسة', 'كشري', 'مندي', 'فول', 'ملوخية', 'شاورما'] : ['Kabsa', 'Koshary', 'Mandi', 'Ful', 'Molokhia', 'Shawarma']).map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(187,92,246,0.12)', color: 'var(--spark-light)' }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Training */}
          <Reveal className="md:col-span-2">
            <div className={`${cellBase} h-full`} style={cellStyle}>
              <div className="flex items-center gap-2.5 mb-3">
                <Dumbbell size={18} style={{ color: '#D88BFF' }} />
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.plans.title}</h3>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed">{copy.cells.plans.body}</p>
              {/* mini progression bars */}
              <div className="mt-4 flex items-end gap-1.5 h-12">
                {[35, 48, 42, 60, 70, 64, 85].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 6 ? 'linear-gradient(180deg,#D88BFF,#7B2FFF)' : 'rgba(187,92,246,0.25)' }} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* InBody */}
          <Reveal delay={0.06} className="md:col-span-2">
            <div className={`${cellBase} h-full`} style={cellStyle}>
              <div className="flex items-center gap-2.5 mb-3">
                <ScanLine size={18} style={{ color: '#D88BFF' }} />
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.scan.title}</h3>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed">{copy.cells.scan.body}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {(ar ? [['دهون', '18.2%'], ['عضلات', '36.4kg'], ['BMR', '1,742']] : [['Body fat', '18.2%'], ['Muscle', '36.4kg'], ['BMR', '1,742']]).map(([k, v]) => (
                  <div key={k} className="rounded-xl py-2" style={{ background: 'var(--silver-faint)', border: '1px solid var(--silver-rim)' }}>
                    <p className="text-[10px] text-silver-muted">{k}</p>
                    <p className="font-heading font-bold text-[13px]" style={{ color: 'var(--silver)' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Camera */}
          <Reveal delay={0.12} className="md:col-span-2">
            <div className={`${cellBase} h-full`} style={cellStyle}>
              <div className="flex items-center gap-2.5 mb-3">
                <Camera size={18} style={{ color: '#D88BFF' }} />
                <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.camera.title}</h3>
              </div>
              <p className="text-silver-muted text-sm leading-relaxed">{copy.cells.camera.body}</p>
            </div>
          </Reveal>

          {/* Proactive — wide */}
          <Reveal className="md:col-span-6">
            <div className={cellBase} style={cellStyleSpark}>
              <div className={`flex flex-col md:flex-row md:items-center gap-5 ${ar ? 'md:flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Bell size={18} style={{ color: '#D88BFF' }} />
                    <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--silver)' }}>{copy.cells.proactive.title}</h3>
                  </div>
                  <p className="text-silver-muted text-sm leading-relaxed max-w-lg">{copy.cells.proactive.body}</p>
                </div>
                {/* mini notification stack */}
                <div className="flex flex-col gap-2 w-full md:w-80">
                  {(ar
                    ? [['💧 ترطيب', 'اشرب ~350 مل الآن'], ['💪 وقت التمرين', 'دفع — صدر وأكتاف · 6:00م'], ['🌙 مراجعة المساء', 'سجّل ما فاتك اليوم']]
                    : [['💧 Hydration', 'Drink ~350 ml now'], ['💪 Training time', 'Push — Chest & Shoulders · 6:00 PM'], ['🌙 Evening check-in', 'Log anything you missed']]
                  ).map(([title, body], i) => (
                    <div key={title} className="rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(10,10,12,0.75)', border: '1px solid rgba(255,255,255,0.08)', opacity: 1 - i * 0.18 }}>
                      <p className="text-[12px] font-heading font-bold" style={{ color: '#F8FAFC' }}>{title}</p>
                      <p className="text-[11px]" style={{ color: '#94A3B8' }}>{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Long tail */}
        <Reveal delay={0.1} className="mt-10">
          <p className="text-center text-[11px] font-heading tracking-[0.25em] uppercase text-silver-muted/60 mb-4">{copy.moreLabel}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {copy.more.map(item => (
              <span key={item} className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'var(--silver-faint)', border: '1px solid var(--silver-rim)', color: 'var(--silver-muted)' }}>
                {item}
              </span>
            ))}
          </div>
          <p className="text-center text-silver-muted/50 text-[11px] mt-4">⭐ {ar ? 'ميزات خطة Elite' : 'Elite plan features'}</p>
        </Reveal>
      </div>
    </section>
  )
}
