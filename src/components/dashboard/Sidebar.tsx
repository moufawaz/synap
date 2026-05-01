'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SynapLogo from '@/components/ui/SynapLogo'
import IonAvatar from '@/components/ui/IonAvatar'
import {
  LayoutDashboard, MessageCircle, Dumbbell, UtensilsCrossed,
  Ruler, TrendingUp, Settings, Shield, LogOut,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelAr: 'الرئيسية' },
  { href: '/chat', icon: MessageCircle, label: 'Chat Ion', labelAr: 'تحدث مع Ion' },
  { href: '/workout', icon: Dumbbell, label: 'Workout', labelAr: 'التدريب' },
  { href: '/nutrition', icon: UtensilsCrossed, label: 'Nutrition', labelAr: 'التغذية' },
  { href: '/measurements', icon: Ruler, label: 'Measurements', labelAr: 'القياسات' },
  { href: '/progress', icon: TrendingUp, label: 'Progress', labelAr: 'التقدم' },
]

const BOTTOM_NAV = [
  { href: '/settings', icon: Settings, label: 'Settings', labelAr: 'الإعدادات' },
]

interface SidebarProps {
  user: { name: string; email: string; gender?: string; isAdmin?: boolean }
  lang?: 'en' | 'ar'
}

export default function Sidebar({ user, lang = 'en' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isRTL = lang === 'ar'

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [...NAV, ...(user.isAdmin ? [{ href: '/admin', icon: Shield, label: 'Admin', labelAr: 'الإدارة' }] : []), ...BOTTOM_NAV]

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen sticky top-0 flex-shrink-0"
      style={{ background: '#0A0A0A', borderRight: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <SynapLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-heading font-semibold tracking-wider transition-all duration-150 group"
              style={{
                color: active ? '#CC80FF' : '#475569',
                background: active ? 'rgba(187,92,246,0.12)' : 'transparent',
                border: active ? '1px solid rgba(187,92,246,0.2)' : '1px solid transparent',
                letterSpacing: '0.04em',
              }}
            >
              <item.icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
              {isRTL ? item.labelAr : item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
        {user.isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-heading font-semibold tracking-wider transition-all"
            style={{
              color: pathname === '/admin' ? '#CC80FF' : '#475569',
              background: pathname === '/admin' ? 'rgba(187,92,246,0.12)' : 'transparent',
              border: pathname === '/admin' ? '1px solid rgba(187,92,246,0.2)' : '1px solid transparent',
              letterSpacing: '0.04em',
            }}
          >
            <Shield size={16} style={{ flexShrink: 0 }} />
            Admin
          </Link>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-heading font-semibold tracking-wider transition-all"
          style={{
            color: pathname === '/settings' ? '#CC80FF' : '#475569',
            background: pathname === '/settings' ? 'rgba(187,92,246,0.12)' : 'transparent',
            border: pathname === '/settings' ? '1px solid rgba(187,92,246,0.2)' : '1px solid transparent',
            letterSpacing: '0.04em',
          }}
        >
          <Settings size={16} style={{ flexShrink: 0 }} />
          {isRTL ? 'الإعدادات' : 'Settings'}
        </Link>

        {/* User card */}
        <div className="mt-2 p-3 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5">
            <IonAvatar gender={(user.gender as any) || 'male'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-xs text-white truncate tracking-wider" style={{ letterSpacing: '0.04em' }}>
                {user.name || 'Athlete'}
              </p>
              <p className="font-heading text-[10px] truncate" style={{ color: '#475569' }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: '#475569' }}
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
