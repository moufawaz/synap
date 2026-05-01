'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageCircle, Dumbbell, UtensilsCrossed, TrendingUp } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
      style={{
        background: 'rgba(8,8,8,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {NAV.map(item => {
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
            style={{
              color: active ? '#BB5CF6' : '#475569',
              background: active ? 'rgba(187,92,246,0.1)' : 'transparent',
            }}
          >
            <item.icon size={20} />
            <span className="font-heading text-[9px] font-semibold tracking-wider" style={{ letterSpacing: '0.08em' }}>
              {item.label.toUpperCase()}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
