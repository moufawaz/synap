'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageCircle, Flame, UtensilsCrossed, TrendingUp, Grid3X3 } from 'lucide-react'

const NAV = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Home',      labelAr: 'الرئيسية' },
  { href: '/chat',          icon: MessageCircle,   label: 'Chat',      labelAr: 'المحادثة' },
  { href: '/workout/today', icon: Flame,           label: 'Train',     labelAr: 'التمرين'  },
  { href: '/nutrition',     icon: UtensilsCrossed, label: 'Nutrition', labelAr: 'التغذية'  },
  { href: '/progress',      icon: TrendingUp,      label: 'Progress',  labelAr: 'التقدم'   },
]

// Pages that belong to the "More" section — keeps the tab highlighted when on them
const MORE_PATHS = ['/plan', '/workout', '/measurements', '/eating-out', '/grocery-list', '/form-check', '/settings', '/more']

export default function MobileNav({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const pathname = usePathname()
  const isRTL = lang === 'ar'

  const moreActive = MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pt-2"
      style={{
        background: 'rgba(8,8,16,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        // Push content above the home indicator on iPhone X+
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
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

      {/* More → full page */}
      <Link
        href="/more"
        className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
        style={{
          color: moreActive ? '#D88BFF' : '#475569',
          background: moreActive ? 'rgba(187,92,246,0.12)' : 'transparent',
        }}
      >
        <Grid3X3 size={20} />
        <span className="font-heading text-[9px] font-semibold tracking-wider" style={{ letterSpacing: '0.08em' }}>
          {isRTL ? 'المزيد' : 'MORE'}
        </span>
      </Link>
    </nav>
  )
}
