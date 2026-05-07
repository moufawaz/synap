'use client'

import { type Language } from '@/lib/i18n'
import { AlertTriangle, Clock, BellOff } from 'lucide-react'

interface Props { lang: Language }

const EN = {
  headline: "Generic plans fail. Ion doesn't.",
  blocks: [
    {
      icon: AlertTriangle,
      title: 'Built for nobody.',
      body: 'Every fitness app gives you the same plan as 10,000 other people. Ion builds yours from scratch — around your food, your schedule, your body, and your actual life.',
    },
    {
      icon: Clock,
      title: 'Forgets you the moment you leave.',
      body: 'General AI forgets you the moment you close the tab. Ion remembers every meal, every workout, every measurement — from day one to day one thousand.',
    },
    {
      icon: BellOff,
      title: 'Never reaches out.',
      body: 'Your fitness app never reaches out. Ion checks in every morning, reminds you before workouts, and catches problems before they become setbacks.',
    },
  ],
}

const AR = {
  headline: 'الخطط العامة تفشل. آيون لا يفشل.',
  blocks: [
    {
      icon: AlertTriangle,
      title: 'مبني للجميع، لا لك.',
      body: 'كل تطبيق لياقة يعطيك نفس الخطة كـ 10,000 شخص آخر. آيون يبنيها من الصفر — حول طعامك وجدولك وجسمك وحياتك الفعلية.',
    },
    {
      icon: Clock,
      title: 'ينساك فور إغلاق التطبيق.',
      body: 'الذكاء الاصطناعي العام ينساك بمجرد إغلاق التطبيق. آيون يتذكر كل وجبة، كل تمرين، كل قياس — من اليوم الأول إلى اليوم الألف.',
    },
    {
      icon: BellOff,
      title: 'لا يتواصل معك أبداً.',
      body: 'تطبيق اللياقة لا يتواصل معك أبداً. آيون يراجعك كل صباح، ويذكرك قبل التمرين، ويكتشف المشاكل قبل أن تتحول إلى عقبات.',
    },
  ],
}

export default function TheProblem({ lang }: Props) {
  const isRTL = lang === 'ar'
  const copy = isRTL ? AR : EN

  return (
    <section className="relative py-24 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="orb w-[600px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(187,92,246,0.06)' }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-light">
            {copy.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.blocks.map((block, i) => {
            const Icon = block.icon
            return (
              <div key={i} className="glass-card p-8 flex flex-col gap-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(187,92,246,0.15)', border: '1px solid rgba(187,92,246,0.3)' }}>
                  <Icon size={22} className="text-violet" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading font-bold text-lg text-light">{block.title}</h3>
                  <p className="text-light-muted text-sm leading-relaxed">{block.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
