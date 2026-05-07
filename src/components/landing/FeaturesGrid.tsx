'use client'

import { type Language } from '@/lib/i18n'
import { Utensils, Dumbbell, BarChart2, Camera, Bell, RefreshCw, Target, FileText, Pill, Globe, Watch, Users } from 'lucide-react'

interface Props { lang: Language }

const EN = {
  label: 'Everything Ion Does',
  headline: 'Everything Ion does for you',
  features: [
    { icon: Utensils, title: 'Adaptive Diet Plans', body: "Ion builds meal plans from food you love — timed to your exact schedule. Log in plain text: 'I had kabsa for lunch.' Ion handles the math.", badge: null },
    { icon: Dumbbell, title: 'Smart Workout Programs', body: 'Gym or home. 6-week progressive programs with video for every exercise. Ion shows you exactly how — and increases difficulty as you get stronger.', badge: null },
    { icon: BarChart2, title: 'Full Body Tracking', body: '13 body measurements tracked from day one. Symmetry gaps detected. Charts showing every change. Progress photos stored privately.', badge: null },
    { icon: Camera, title: 'Barcode Food Scanner', body: 'Point your camera at any product. Ion reads the label and logs the macros instantly. No manual entry. No guessing.', badge: null },
    { icon: Bell, title: 'Proactive Check-ins', body: "Ion reaches out — you don't have to remember. Morning messages, pre-workout reminders, meal log nudges, plateau alerts.", badge: null },
    { icon: RefreshCw, title: 'Plan Renewal That Learns', body: 'Every cycle Ion reviews your results, asks what worked, and rebuilds your plan around your new reality.', badge: null },
    { icon: Target, title: 'Goal Timeline Prediction', body: "Ion calculates your current pace and tells you exactly when you'll hit your goal — and what needs to change to get there faster.", badge: 'Elite ⭐' },
    { icon: FileText, title: 'Weekly Body Composition Report', body: 'Every Friday Ion generates a full report — what changed, what\'s working, what needs attention. Delivered to your inbox.', badge: 'Elite ⭐' },
    { icon: Pill, title: 'Supplement Recommendations', body: 'Based on your diet gaps and training — Ion recommends exactly what supplements help, right dose, right timing, where to buy in Saudi Arabia.', badge: 'Elite ⭐' },
    { icon: Globe, title: 'Bilingual Arabic + English', body: 'Full Arabic and English support. Ion speaks your language. RTL interface. Saudi food database. Local context built in.', badge: null },
    { icon: Watch, title: 'Wearable Integration', body: 'Connect Apple Watch or Fitbit. Ion sees your actual steps, heart rate, and sleep — and adjusts your plan accordingly.', badge: 'Coming Soon' },
    { icon: Users, title: 'Community Feed', body: 'See real SYNAP users hitting real goals. The accountability that keeps you consistent.', badge: 'Coming Soon' },
  ],
}

const AR = {
  label: 'كل ما يفعله آيون',
  headline: 'كل ما يفعله آيون من أجلك',
  features: [
    { icon: Utensils, title: 'خطط غذائية تكيفية', body: "آيون يبني خطط وجبات من طعام تحبه — موقّتة بدقة لجدولك. سجّل بنص عادي: 'تناولت كبسة للغداء.' آيون يتولى الحسابات.", badge: null },
    { icon: Dumbbell, title: 'برامج تمرين ذكية', body: 'صالة أو منزل. برامج تدريجية لـ 6 أسابيع مع فيديو لكل تمرين. آيون يريك الطريقة الصحيحة تماماً — ويزيد الصعوبة مع تقوّيك.', badge: null },
    { icon: BarChart2, title: 'تتبع الجسم الكامل', body: '13 قياساً للجسم مُتتبَّعة من اليوم الأول. اكتشاف فجوات التناسق. مخططات تُظهر كل تغيير. صور التقدم محفوظة بشكل خاص.', badge: null },
    { icon: Camera, title: 'ماسح بارکود الطعام', body: 'وجّه كاميرتك نحو أي منتج. آيون يقرأ الملصق ويسجل المغذيات فوراً. لا إدخال يدوي. لا تخمين.', badge: null },
    { icon: Bell, title: 'متابعة استباقية', body: 'آيون يتواصل معك — لا تحتاج أن تتذكر. رسائل صباحية، تذكيرات قبل التمرين، تنبيهات تسجيل الوجبات، تنبيهات التوقف.', badge: null },
    { icon: RefreshCw, title: 'تجديد الخطة الذكي', body: 'كل دورة يراجع آيون نتائجك، ويسأل ما الذي نجح، ويعيد بناء خطتك حول واقعك الجديد.', badge: null },
    { icon: Target, title: 'التنبؤ بالجدول الزمني للهدف', body: 'آيون يحسب وتيرتك الحالية ويخبرك بالضبط متى ستحقق هدفك — وما الذي يجب تغييره للوصول بشكل أسرع.', badge: 'Elite ⭐' },
    { icon: FileText, title: 'تقرير تركيبة الجسم الأسبوعي', body: 'كل جمعة آيون يولّد تقريراً كاملاً — ماذا تغيّر، ما الذي ينجح، ما الذي يحتاج اهتماماً. يُرسل إلى بريدك.', badge: 'Elite ⭐' },
    { icon: Pill, title: 'توصيات المكملات الغذائية', body: 'بناءً على نقص نظامك الغذائي وتدريبك — آيون يوصي بالمكملات المناسبة، الجرعة الصحيحة، التوقيت، وأين تشتريها في السعودية.', badge: 'Elite ⭐' },
    { icon: Globe, title: 'ثنائي اللغة عربي + إنجليزي', body: 'دعم كامل للعربية والإنجليزية. آيون يتحدث لغتك. واجهة RTL. قاعدة بيانات طعام سعودي. سياق محلي مدمج.', badge: null },
    { icon: Watch, title: 'تكامل الأجهزة القابلة للارتداء', body: 'وصّل Apple Watch أو Fitbit. آيون يرى خطواتك الفعلية، معدل قلبك، ونومك — ويعدّل خطتك وفقاً لذلك.', badge: 'قريباً' },
    { icon: Users, title: 'مجتمع المستخدمين', body: 'اطّلع على نتائج حقيقية لمستخدمي SYNAP الحقيقيين. المساءلة التي تبقيك ثابتاً.', badge: 'قريباً' },
  ],
}

export default function FeaturesGrid({ lang }: Props) {
  const isRTL = lang === 'ar'
  const copy = isRTL ? AR : EN

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[600px] h-[600px] top-1/2 right-[-200px] -translate-y-1/2" style={{ background: 'rgba(187,92,246,0.06)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <span className="font-heading text-xs tracking-widest uppercase text-violet/80 mb-4 block">
            {copy.label}
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light">
            {copy.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {copy.features.map((feature, i) => {
            const Icon = feature.icon
            const isElite = feature.badge?.includes('Elite') || feature.badge?.includes('⭐')
            const isComingSoon = feature.badge?.includes('Soon') || feature.badge?.includes('قريباً')

            return (
              <div key={i} className="glass-card p-6 flex flex-col gap-4 relative"
                style={isElite ? { border: '1px solid rgba(187,92,246,0.25)', background: 'rgba(187,92,246,0.04)' } : undefined}>

                {feature.badge && (
                  <span className="absolute top-4 right-4 font-heading text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full"
                    style={{
                      background: isElite ? 'rgba(187,92,246,0.2)' : 'rgba(100,116,139,0.2)',
                      color: isElite ? '#BB5CF6' : '#64748B',
                      border: `1px solid ${isElite ? 'rgba(187,92,246,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                    {feature.badge}
                  </span>
                )}

                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(187,92,246,0.12)', border: '1px solid rgba(187,92,246,0.25)' }}>
                  <Icon size={18} className="text-violet" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="font-heading font-bold text-base text-light">{feature.title}</h3>
                  <p className="text-light-muted text-xs leading-relaxed">{feature.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
