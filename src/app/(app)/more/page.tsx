'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Dumbbell, Ruler, UtensilsCrossed,
  ShoppingBasket, Camera, Settings, ArrowLeft, TrendingUp,
  MessageCircle, Flame, LayoutDashboard,
} from 'lucide-react'
import { useLanguage } from '@/lib/useLanguage'

const ALL_PAGES = [
  {
    group: { en: 'TRAINING', ar: 'التمرين' },
    items: [
      { href: '/plan',          icon: ClipboardList,  label: 'My Plan',      labelAr: 'خطتي',           desc: 'Your full diet & workout plan',       descAr: 'خطتك الغذائية والتدريبية' },
      { href: '/workout',       icon: Dumbbell,       label: 'Programme',    labelAr: 'البرنامج الكامل', desc: 'Full 12-week workout programme',      descAr: 'برنامج التمرين ١٢ أسبوع' },
      { href: '/workout/today', icon: Flame,          label: "Today's Workout", labelAr: 'تمرين اليوم',  desc: "Jump into today's session",           descAr: 'ابدأ تمرين اليوم' },
    ],
  },
  {
    group: { en: 'NUTRITION', ar: 'التغذية' },
    items: [
      { href: '/nutrition',     icon: UtensilsCrossed, label: 'Nutrition',   labelAr: 'التغذية',         desc: "Today's meals & macro tracker",       descAr: 'وجبات اليوم وتتبع الماكرو' },
      { href: '/eating-out',    icon: UtensilsCrossed, label: 'Eating Out',  labelAr: 'الأكل خارج',      desc: 'Smart choices at restaurants',        descAr: 'خيارات ذكية في المطاعم' },
      { href: '/grocery-list',  icon: ShoppingBasket,  label: 'Grocery List',labelAr: 'قائمة التسوق',   desc: 'Weekly grocery list from your plan',  descAr: 'قائمة تسوق أسبوعية من خطتك' },
    ],
  },
  {
    group: { en: 'TRACKING', ar: 'المتابعة' },
    items: [
      { href: '/measurements',  icon: Ruler,          label: 'Measurements', labelAr: 'القياسات',        desc: 'Log and track body measurements',     descAr: 'سجّل وتابع قياسات جسمك' },
      { href: '/progress',      icon: TrendingUp,     label: 'Progress',     labelAr: 'التقدم',          desc: 'Charts, photos & milestones',         descAr: 'الرسوم البيانية والتقدم' },
      { href: '/form-check',    icon: Camera,         label: 'Form Check',   labelAr: 'تحقق الأداء',     desc: 'Get feedback on your exercise form',  descAr: 'احصل على تقييم أدائك' },
    ],
  },
  {
    group: { en: 'GENERAL', ar: 'عام' },
    items: [
      { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',   labelAr: 'الرئيسية',        desc: 'Overview of your day',                descAr: 'نظرة عامة على يومك' },
      { href: '/chat',          icon: MessageCircle,   label: 'Ask Ion',     labelAr: 'اسأل آيون',       desc: 'Chat with your AI coach',             descAr: 'تحدث مع مدربك الذكي' },
      { href: '/settings',      icon: Settings,        label: 'Settings',    labelAr: 'الإعدادات',       desc: 'Profile, billing & preferences',      descAr: 'الملف الشخصي والإعدادات' },
    ],
  },
]

export default function MorePage() {
  const router = useRouter()
  const { isRTL } = useLanguage()

  return (
    <div className="min-h-screen pb-28" style={{ background: '#080808' }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(8,8,8,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          aria-label={isRTL ? 'رجوع' : 'Go back'}
        >
          <ArrowLeft size={16} style={{ color: '#94A3B8', transform: isRTL ? 'scaleX(-1)' : undefined }} />
        </button>
        <div>
          <p className="font-heading font-bold text-base text-white tracking-wide">
            {isRTL ? 'كل الصفحات' : 'All Pages'}
          </p>
          <p className="font-heading text-xs" style={{ color: '#475569' }}>
            {isRTL ? 'اختر أي صفحة تريد' : 'Go anywhere in the app'}
          </p>
        </div>
      </div>

      {/* Page groups */}
      <div className="px-4 pt-5 flex flex-col gap-6">
        {ALL_PAGES.map(section => (
          <div key={section.group.en}>
            {/* Section label */}
            <p
              className="font-heading font-bold text-[10px] tracking-widest mb-3"
              style={{ color: '#475569', letterSpacing: '0.16em' }}
            >
              {isRTL ? section.group.ar : section.group.en}
            </p>

            {/* Items */}
            <div className="flex flex-col gap-2">
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(187,92,246,0.1)' }}
                  >
                    <item.icon size={18} style={{ color: '#BB5CF6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm text-white">
                      {isRTL ? item.labelAr : item.label}
                    </p>
                    <p className="font-heading text-xs mt-0.5 truncate" style={{ color: '#475569' }}>
                      {isRTL ? item.descAr : item.desc}
                    </p>
                  </div>
                  <ArrowLeft
                    size={14}
                    style={{ color: '#334155', flexShrink: 0, transform: isRTL ? undefined : 'scaleX(-1)' }}
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
