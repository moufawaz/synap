'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageCircle, Flame, UtensilsCrossed, TrendingUp,
  Grid3X3, ClipboardList, Dumbbell, ShoppingBasket, Camera, Ruler,
  X, Settings, UtensilsCrossed as EatingOut, ChevronRight,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Home',      labelAr: 'الرئيسية' },
  { href: '/chat',          icon: MessageCircle,   label: 'Chat',      labelAr: 'المحادثة' },
  { href: '/workout/today', icon: Flame,           label: 'Train',     labelAr: 'التمرين'  },
  { href: '/nutrition',     icon: UtensilsCrossed, label: 'Nutrition', labelAr: 'التغذية'  },
  { href: '/progress',      icon: TrendingUp,      label: 'Progress',  labelAr: 'التقدم'   },
]

const MORE_ITEMS = [
  { href: '/plan',          icon: ClipboardList,  label: 'My Plan',      labelAr: 'خطتي'         },
  { href: '/workout',       icon: Dumbbell,       label: 'Programme',    labelAr: 'البرنامج'      },
  { href: '/measurements',  icon: Ruler,          label: 'Measurements', labelAr: 'القياسات'      },
  { href: '/eating-out',    icon: EatingOut,      label: 'Eating Out',   labelAr: 'الأكل خارج'    },
  { href: '/grocery-list',  icon: ShoppingBasket, label: 'Grocery List', labelAr: 'قائمة التسوق'  },
  { href: '/form-check',    icon: Camera,         label: 'Form Check',   labelAr: 'تحقق الشكل'    },
]

export default function MobileNav({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const pathname = usePathname()
  const isRTL = lang === 'ar'
  const [sheetOpen, setSheetOpen] = useState(false)

  // Is current page one of the "more" pages?
  const moreActive = MORE_ITEMS.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))

  return (
    <>
      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/60"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* More sheet */}
      <div
        className="md:hidden fixed left-0 right-0 z-[70] rounded-t-3xl transition-transform duration-300"
        style={{
          bottom: '64px',
          background: '#0D0D1A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(110%)',
        }}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="font-heading font-bold text-xs tracking-widest uppercase" style={{ color: '#BB5CF6', letterSpacing: '0.14em' }}>
            {isRTL ? 'كل الصفحات' : 'ALL PAGES'}
          </p>
          <button
            onClick={() => setSheetOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={13} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Grid of more items */}
        <div className="grid grid-cols-3 gap-3 p-4">
          {MORE_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSheetOpen(false)}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl transition-all"
                style={{
                  background: active ? 'rgba(187,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(187,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <item.icon size={22} style={{ color: active ? '#D88BFF' : '#64748B' }} />
                <span className="font-heading text-[10px] font-semibold text-center leading-tight" style={{ color: active ? '#D88BFF' : '#94A3B8' }}>
                  {isRTL ? item.labelAr : item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Settings row */}
        <div className="px-4 pb-5">
          <Link
            href="/settings"
            onClick={() => setSheetOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
            style={{
              background: pathname === '/settings' ? 'rgba(187,92,246,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${pathname === '/settings' ? 'rgba(187,92,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} style={{ color: pathname === '/settings' ? '#D88BFF' : '#64748B' }} />
              <span className="font-heading text-sm font-semibold" style={{ color: pathname === '/settings' ? '#D88BFF' : '#94A3B8' }}>
                {isRTL ? 'الإعدادات' : 'Settings'}
              </span>
            </div>
            <ChevronRight size={14} style={{ color: '#475569' }} />
          </Link>
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: 'rgba(8,8,16,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {NAV.map(item => {
          const active = pathname === item.href
            || (item.href !== '/dashboard' && item.href !== '/workout/today' && pathname.startsWith(item.href))
            || (item.href === '/workout/today' && (pathname === '/workout/today' || pathname === '/workout'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{
                color: active ? '#D88BFF' : '#475569',
                background: active ? 'rgba(187,92,246,0.12)' : 'transparent',
              }}
            >
              <item.icon size={20} />
              <span className="font-heading text-[9px] font-semibold tracking-wider" style={{ letterSpacing: '0.08em' }}>
                {isRTL ? item.labelAr : item.label.toUpperCase()}
              </span>
            </Link>
          )
        })}

        {/* More tab */}
        <button
          onClick={() => setSheetOpen(o => !o)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
          style={{
            color: sheetOpen || moreActive ? '#D88BFF' : '#475569',
            background: sheetOpen || moreActive ? 'rgba(187,92,246,0.12)' : 'transparent',
          }}
        >
          <Grid3X3 size={20} />
          <span className="font-heading text-[9px] font-semibold tracking-wider" style={{ letterSpacing: '0.08em' }}>
            {isRTL ? 'المزيد' : 'MORE'}
          </span>
        </button>
      </nav>
    </>
  )
}
